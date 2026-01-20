-- Add public SELECT policy for activated pet tags (needed for public pet page)
CREATE POLICY "Anyone can view activated pet tags" 
ON public.pet_tags 
FOR SELECT 
USING (is_activated = true);