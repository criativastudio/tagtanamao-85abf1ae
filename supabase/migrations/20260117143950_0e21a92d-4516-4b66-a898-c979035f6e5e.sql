-- ===========================================
-- EXTENSIONS
-- ===========================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===========================================
-- HELPER FUNCTION: Check if user is admin
-- ===========================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_admin = true
  );
END;
$$;

-- ===========================================
-- TABLE: profiles
-- ===========================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own profile" ON public.profiles;
CREATE POLICY "Users select own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id OR public.is_admin());

-- ===========================================
-- Trigger: auto create profile
-- ===========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- TABLE: products
-- ===========================================

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('pet_tag','business_display','nfc_card','nfc_tag')),
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view active products" ON public.products;
CREATE POLICY "Public view active products"
ON public.products FOR SELECT
USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage products" ON public.products;
CREATE POLICY "Admins manage products"
ON public.products FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ===========================================
-- TABLE: pet_tags
-- ===========================================

CREATE TABLE IF NOT EXISTS public.pet_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  qr_code TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  slug TEXT UNIQUE,
  is_activated BOOLEAN DEFAULT false,
  pet_name TEXT,
  pet_photo_url TEXT,
  owner_name TEXT,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  reward_enabled BOOLEAN DEFAULT false,
  reward_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pet_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own pet tags" ON public.pet_tags;
CREATE POLICY "Users manage own pet tags"
ON public.pet_tags
FOR ALL
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ===========================================
-- TABLE: business_displays
-- ===========================================

CREATE TABLE IF NOT EXISTS public.business_displays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  qr_code TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  slug TEXT UNIQUE,
  is_activated BOOLEAN DEFAULT false,
  business_name TEXT,
  logo_url TEXT,
  description TEXT,
  buttons JSONB DEFAULT '[]'::jsonb,
  theme_color TEXT DEFAULT '#10b981',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.business_displays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own displays" ON public.business_displays;
CREATE POLICY "Users manage own displays"
ON public.business_displays
FOR ALL
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ===========================================
-- TABLE: orders
-- ===========================================

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','paid','processing','shipped','delivered','cancelled')),
  total_amount NUMERIC(10,2) NOT NULL,
  shipping_name TEXT,
  shipping_address TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_zip TEXT,
  shipping_phone TEXT,
  tracking_code TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own orders" ON public.orders;
CREATE POLICY "Users manage own orders"
ON public.orders
FOR ALL
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ===========================================
-- TABLE: order_items
-- ===========================================

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  pet_tag_id UUID REFERENCES public.pet_tags(id),
  display_id UUID REFERENCES public.business_displays(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own order items" ON public.order_items;
CREATE POLICY "Users manage own order items"
ON public.order_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (o.user_id = auth.uid() OR public.is_admin())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (o.user_id = auth.uid() OR public.is_admin())
  )
);

-- ===========================================
-- TABLE: qr_scans
-- ===========================================

CREATE TABLE IF NOT EXISTS public.qr_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_tag_id UUID REFERENCES public.pet_tags(id) ON DELETE CASCADE,
  display_id UUID REFERENCES public.business_displays(id) ON DELETE CASCADE,
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  city TEXT,
  country TEXT,
  user_agent TEXT,
  ip_address TEXT,
  scanned_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

-- Constraints protegidas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_latitude') THEN
    ALTER TABLE public.qr_scans
    ADD CONSTRAINT valid_latitude
    CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_longitude') THEN
    ALTER TABLE public.qr_scans
    ADD CONSTRAINT valid_longitude
    CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
  END IF;
END $$;

DROP POLICY IF EXISTS "Users view own scans" ON public.qr_scans;
CREATE POLICY "Users view own scans"
ON public.qr_scans FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.pet_tags p WHERE p.id = qr_scans.pet_tag_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.business_displays b WHERE b.id = qr_scans.display_id AND b.user_id = auth.uid())
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Public insert scans" ON public.qr_scans;
CREATE POLICY "Public insert scans"
ON public.qr_scans FOR INSERT
WITH CHECK (true);

-- ===========================================
-- Trigger update updated_at
-- ===========================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pet_tags_updated_at ON public.pet_tags;
CREATE TRIGGER update_pet_tags_updated_at
BEFORE UPDATE ON public.pet_tags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_business_displays_updated_at ON public.business_displays;
CREATE TRIGGER update_business_displays_updated_at
BEFORE UPDATE ON public.business_displays
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- Insert initial products safely
-- ===========================================

INSERT INTO public.products (name, description, type, price, is_active)
SELECT * FROM (
  VALUES
  ('Tag Pet QR Code','Tag inteligente para coleira do seu pet com QR Code único.','pet_tag',59.90,true),
  ('Kit 2 Tags Pet','2 Tags Pet QR Code com desconto especial.','pet_tag',99.90,true),
  ('Kit 3 Tags Pet','3 Tags Pet QR Code com super desconto.','pet_tag',109.90,true),
  ('Display QR Code Empresarial','Display elegante com QR Code para empresa.','business_display',89.90,true)
) AS v(name, description, type, price, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.products);
