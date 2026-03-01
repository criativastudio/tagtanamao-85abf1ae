
-- Create coupon_products junction table
CREATE TABLE coupon_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(coupon_id, product_id)
);

ALTER TABLE coupon_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coupon_products" ON coupon_products FOR ALL USING (is_admin());
CREATE POLICY "Authenticated can read coupon_products" ON coupon_products FOR SELECT USING (true);

-- Add exclude_combos column to coupons
ALTER TABLE coupons ADD COLUMN exclude_combos BOOLEAN DEFAULT true;
