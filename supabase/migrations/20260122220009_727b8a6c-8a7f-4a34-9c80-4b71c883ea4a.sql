-- Add gallery_photos and buttons columns to pet_tags table for advanced customization
ALTER TABLE public.pet_tags 
ADD COLUMN IF NOT EXISTS gallery_photos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS buttons JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#10b981';

-- Add index for better performance on JSONB columns
CREATE INDEX IF NOT EXISTS idx_pet_tags_buttons ON public.pet_tags USING GIN(buttons);
CREATE INDEX IF NOT EXISTS idx_pet_tags_gallery ON public.pet_tags USING GIN(gallery_photos);