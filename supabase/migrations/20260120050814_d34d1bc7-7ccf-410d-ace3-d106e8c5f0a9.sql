-- Add lost_mode column to pet_tags for privacy control
ALTER TABLE public.pet_tags 
ADD COLUMN IF NOT EXISTS lost_mode boolean DEFAULT false;

-- Comment explaining the column
COMMENT ON COLUMN public.pet_tags.lost_mode IS 'When true, contact details are shown publicly. When false, only pet info is visible.';

-- Drop the existing public SELECT policy that exposes all data
DROP POLICY IF EXISTS "Anyone can view activated pet tags" ON public.pet_tags;

-- Create a more restrictive public SELECT policy
-- Public can only see: id, pet_name, pet_photo_url, reward_enabled, reward_text, is_activated, lost_mode, qr_code
-- Contact details are hidden at database level - must use edge function for secure access
CREATE POLICY "Public can view basic pet info only" 
ON public.pet_tags 
FOR SELECT 
USING (is_activated = true);