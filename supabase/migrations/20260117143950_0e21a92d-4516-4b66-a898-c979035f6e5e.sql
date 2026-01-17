-- ===========================================
-- HELPER FUNCTION: Check if user is admin
-- ===========================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ===========================================
-- TABLE: profiles (user data)
-- ===========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can do all on profiles" ON public.profiles
  FOR ALL USING (is_admin());

-- Trigger for profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- TABLE: products (e-commerce)
-- ===========================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('pet_tag', 'business_display', 'nfc_card', 'nfc_tag')),
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products" ON public.products
  FOR SELECT USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (is_admin());

-- ===========================================
-- TABLE: pet_tags
-- ===========================================
CREATE TABLE public.pet_tags (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.pet_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pet tags" ON public.pet_tags
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can create own pet tags" ON public.pet_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pet tags" ON public.pet_tags
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own pet tags" ON public.pet_tags
  FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- ===========================================
-- TABLE: business_displays
-- ===========================================
CREATE TABLE public.business_displays (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.business_displays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own displays" ON public.business_displays
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can create own displays" ON public.business_displays
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own displays" ON public.business_displays
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own displays" ON public.business_displays
  FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- ===========================================
-- TABLE: orders
-- ===========================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
  total_amount DECIMAL(10,2) NOT NULL,
  shipping_name TEXT,
  shipping_address TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_zip TEXT,
  shipping_phone TEXT,
  tracking_code TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending orders" ON public.orders
  FOR UPDATE USING ((auth.uid() = user_id AND status = 'pending') OR is_admin());

CREATE POLICY "Only admins can delete orders" ON public.orders
  FOR DELETE USING (is_admin());

-- ===========================================
-- TABLE: order_items
-- ===========================================
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  pet_tag_id UUID REFERENCES public.pet_tags(id),
  display_id UUID REFERENCES public.business_displays(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND (user_id = auth.uid() OR is_admin()))
  );

CREATE POLICY "Users can create order items for own orders" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage order items" ON public.order_items
  FOR ALL USING (is_admin());

-- ===========================================
-- TABLE: qr_scans (log de leituras)
-- ===========================================
CREATE TABLE public.qr_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_tag_id UUID REFERENCES public.pet_tags(id) ON DELETE CASCADE,
  display_id UUID REFERENCES public.business_displays(id) ON DELETE CASCADE,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  city TEXT,
  country TEXT,
  user_agent TEXT,
  ip_address TEXT,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

-- Users can view scans of their own tags/displays
CREATE POLICY "Users can view own tag scans" ON public.qr_scans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.pet_tags WHERE id = qr_scans.pet_tag_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.business_displays WHERE id = qr_scans.display_id AND user_id = auth.uid())
    OR is_admin()
  );

-- Insert is allowed for anyone (via edge function)
CREATE POLICY "Anyone can log scans" ON public.qr_scans
  FOR INSERT WITH CHECK (true);

-- ===========================================
-- Trigger: Auto-update updated_at
-- ===========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pet_tags_updated_at
  BEFORE UPDATE ON public.pet_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_displays_updated_at
  BEFORE UPDATE ON public.business_displays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- Insert initial products
-- ===========================================
INSERT INTO public.products (name, description, type, price, is_active) VALUES
  ('Tag Pet QR Code', 'Tag inteligente para coleira do seu pet com QR Code único. Localize seu pet em tempo real.', 'pet_tag', 59.90, true),
  ('Kit 2 Tags Pet', '2 Tags Pet QR Code com desconto especial.', 'pet_tag', 99.90, true),
  ('Kit 3 Tags Pet', '3 Tags Pet QR Code com super desconto.', 'pet_tag', 109.90, true),
  ('Display QR Code Empresarial', 'Display de acrílico elegante com QR Code para sua empresa. Landing page personalizada.', 'business_display', 89.90, true);