-- Remove the overly permissive public SELECT policy
-- All public access should go through the secure get-pet-tag edge function
DROP POLICY IF EXISTS "Public can view basic pet info only" ON public.pet_tags;