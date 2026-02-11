
-- Add element_positions JSONB column to art_templates for storing
-- QR code, logo, and company name positioning metadata
ALTER TABLE public.art_templates 
ADD COLUMN element_positions jsonb DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.art_templates.element_positions IS 
'JSON object storing positions of template elements: qr_code {x,y,width,height}, logo {x,y,width,height}, company_name {x,y,fontSize,fontFamily,textAnchor}, order_number {x,y,fontSize}';
