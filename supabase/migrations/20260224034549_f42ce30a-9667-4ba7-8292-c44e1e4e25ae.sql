
-- Table to store configurable landing page sections
CREATE TABLE public.site_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  section_type TEXT NOT NULL CHECK (section_type IN ('video', 'pet_slides')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_sections ENABLE ROW LEVEL SECURITY;

-- Anyone can read active sections (public landing page)
CREATE POLICY "Anyone can view active sections"
ON public.site_sections
FOR SELECT
USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage sections"
ON public.site_sections
FOR ALL
USING (is_admin());

-- Updated at trigger
CREATE TRIGGER update_site_sections_updated_at
BEFORE UPDATE ON public.site_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
