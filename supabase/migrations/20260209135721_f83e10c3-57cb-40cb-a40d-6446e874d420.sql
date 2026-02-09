
-- Add weight and dimensions to products
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS weight numeric DEFAULT 0.2,
  ADD COLUMN IF NOT EXISTS width numeric DEFAULT 15,
  ADD COLUMN IF NOT EXISTS height numeric DEFAULT 15,
  ADD COLUMN IF NOT EXISTS length numeric DEFAULT 5;

-- Add Melhor Envio fields to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS melhor_envio_shipment_id text,
  ADD COLUMN IF NOT EXISTS melhor_envio_label_url text,
  ADD COLUMN IF NOT EXISTS shipping_carrier text,
  ADD COLUMN IF NOT EXISTS shipping_service_name text,
  ADD COLUMN IF NOT EXISTS shipping_delivery_time integer,
  ADD COLUMN IF NOT EXISTS shipping_status text DEFAULT 'pending';
