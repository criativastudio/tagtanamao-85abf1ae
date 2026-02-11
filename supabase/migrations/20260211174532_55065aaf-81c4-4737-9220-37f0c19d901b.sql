
-- 1. Update orders status constraint to include new statuses
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status = ANY (ARRAY[
    'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled',
    'awaiting_customization', 'art_finalized', 'ready_to_ship'
  ]));

-- 2. Create display_arts table
CREATE TABLE public.display_arts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  template_id UUID REFERENCES public.art_templates(id),
  logo_url TEXT,
  company_name TEXT,
  qr_code_id UUID,
  final_svg TEXT,
  final_pdf_url TEXT,
  locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create qr_codes table
CREATE TABLE public.qr_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  display_art_id UUID REFERENCES public.display_arts(id),
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Add FK from display_arts.qr_code_id to qr_codes
ALTER TABLE public.display_arts 
  ADD CONSTRAINT display_arts_qr_code_id_fkey 
  FOREIGN KEY (qr_code_id) REFERENCES public.qr_codes(id);

-- 5. Trigger for updated_at on display_arts
CREATE TRIGGER update_display_arts_updated_at
  BEFORE UPDATE ON public.display_arts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. RLS for display_arts
ALTER TABLE public.display_arts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own display arts"
  ON public.display_arts FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can create own display arts"
  ON public.display_arts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own unlocked display arts"
  ON public.display_arts FOR UPDATE
  USING ((auth.uid() = user_id AND locked = false) OR is_admin());

-- 7. RLS for qr_codes
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage qr codes"
  ON public.qr_codes FOR ALL
  USING (is_admin());

CREATE POLICY "Users can view own qr codes"
  ON public.qr_codes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = qr_codes.order_id 
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "System can insert qr codes"
  ON public.qr_codes FOR INSERT
  WITH CHECK (true);
