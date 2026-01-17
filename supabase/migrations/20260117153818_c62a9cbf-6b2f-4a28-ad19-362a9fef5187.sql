-- Add validation constraints to qr_scans table to prevent data injection
-- Validate latitude range (-90 to 90)
ALTER TABLE public.qr_scans ADD CONSTRAINT valid_latitude 
  CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

-- Validate longitude range (-180 to 180)
ALTER TABLE public.qr_scans ADD CONSTRAINT valid_longitude 
  CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- Require at least one target (pet_tag or display) for each scan
ALTER TABLE public.qr_scans ADD CONSTRAINT must_have_target 
  CHECK (pet_tag_id IS NOT NULL OR display_id IS NOT NULL);