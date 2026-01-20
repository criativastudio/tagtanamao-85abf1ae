-- E-commerce: Art templates for displays
CREATE TABLE public.art_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  preview_url TEXT,
  svg_content TEXT NOT NULL,
  editable_fields JSONB DEFAULT '[]'::jsonb,
  product_type TEXT NOT NULL DEFAULT 'display',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Customer art customizations
CREATE TABLE public.customer_arts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.art_templates(id) ON DELETE SET NULL,
  custom_data JSONB DEFAULT '{}'::jsonb,
  logo_url TEXT,
  final_svg TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shipping info for orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_method TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_label_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS asaas_payment_link TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Enable RLS
ALTER TABLE public.art_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_arts ENABLE ROW LEVEL SECURITY;

-- Art templates: public read, admin write
CREATE POLICY "Art templates are publicly viewable"
  ON public.art_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage art templates"
  ON public.art_templates FOR ALL
  USING (public.is_admin());

-- Customer arts: users manage their own
CREATE POLICY "Users can view their own arts"
  ON public.customer_arts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own arts"
  ON public.customer_arts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own arts"
  ON public.customer_arts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all arts"
  ON public.customer_arts FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all arts"
  ON public.customer_arts FOR UPDATE
  USING (public.is_admin());

-- Timestamp triggers
CREATE TRIGGER update_art_templates_updated_at
  BEFORE UPDATE ON public.art_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_arts_updated_at
  BEFORE UPDATE ON public.customer_arts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();