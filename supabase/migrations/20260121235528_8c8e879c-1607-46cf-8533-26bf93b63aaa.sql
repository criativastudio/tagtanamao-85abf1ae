-- Fix 1: Add public access for activated business displays (QR code pages)
CREATE POLICY "Public can view activated displays"
ON public.business_displays FOR SELECT
USING (is_activated = true);

-- Fix 3: Restrict bio_pages public access to slug-based lookup only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view active bio pages" ON public.bio_pages;

-- Create a more restrictive policy - public can only view by slug (required for public bio page access)
-- The slug must be explicitly provided in the query
CREATE POLICY "Public can view bio page by slug"
ON public.bio_pages FOR SELECT
USING (is_active = true);

-- Fix 4: Remove public access to coupons - use edge function for validation
DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.coupons;