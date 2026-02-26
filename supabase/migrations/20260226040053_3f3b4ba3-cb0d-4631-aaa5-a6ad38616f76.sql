ALTER TABLE public.display_templates
ADD COLUMN gallery_images text[] DEFAULT '{}'::text[];