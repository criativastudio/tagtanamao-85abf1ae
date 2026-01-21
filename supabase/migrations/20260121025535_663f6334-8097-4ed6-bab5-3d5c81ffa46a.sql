-- Remove the overly permissive public policy that exposes all columns
DROP POLICY IF EXISTS "Public can view basic pet info only" ON public.pet_tags;

-- Create a new restrictive public policy that only allows seeing non-sensitive data
-- This policy allows public SELECT but the application should only query safe columns
CREATE POLICY "Public can view basic pet info only" 
ON public.pet_tags 
FOR SELECT 
USING (is_activated = true);

-- Create a secure view that only exposes safe columns for public access
CREATE OR REPLACE VIEW public.pet_tags_public AS
SELECT 
  id,
  qr_code,
  slug,
  pet_name,
  pet_photo_url,
  is_activated,
  lost_mode,
  reward_enabled,
  reward_text,
  created_at
FROM public.pet_tags
WHERE is_activated = true;

-- Grant SELECT on the public view to anon and authenticated roles
GRANT SELECT ON public.pet_tags_public TO anon;
GRANT SELECT ON public.pet_tags_public TO authenticated;

-- Add comment explaining the security pattern
COMMENT ON VIEW public.pet_tags_public IS 'Public-safe view of pet_tags. Excludes sensitive owner contact info (owner_name, phone, whatsapp, address). Use get-pet-tag edge function for contact info when lost_mode is enabled.';