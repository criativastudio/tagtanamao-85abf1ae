-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_order_value NUMERIC DEFAULT 0,
  max_discount NUMERIC,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Admins can manage coupons
CREATE POLICY "Admins can manage coupons"
ON public.coupons
FOR ALL
USING (public.is_admin());

-- Everyone can read active coupons (for validation)
CREATE POLICY "Anyone can read active coupons"
ON public.coupons
FOR SELECT
USING (is_active = true);

-- Add coupon reference to orders
ALTER TABLE public.orders 
ADD COLUMN coupon_id UUID REFERENCES public.coupons(id),
ADD COLUMN discount_amount NUMERIC DEFAULT 0;

-- Trigger to update updated_at
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();