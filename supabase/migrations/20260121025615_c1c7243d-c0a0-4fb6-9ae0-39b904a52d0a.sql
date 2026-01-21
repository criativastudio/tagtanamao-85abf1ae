-- Drop the security definer view and recreate with SECURITY INVOKER (default)
DROP VIEW IF EXISTS public.pet_tags_public;

-- Recreate view with explicit SECURITY INVOKER
CREATE VIEW public.pet_tags_public 
WITH (security_invoker = true) AS
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

-- Grant SELECT on the public view
GRANT SELECT ON public.pet_tags_public TO anon;
GRANT SELECT ON public.pet_tags_public TO authenticated;

COMMENT ON VIEW public.pet_tags_public IS 'Public-safe view of pet_tags with SECURITY INVOKER. Excludes sensitive owner contact info.';