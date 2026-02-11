-- Add missing element_positions column used by templates
ALTER TABLE public.art_templates
ADD COLUMN IF NOT EXISTS element_positions JSONB;
