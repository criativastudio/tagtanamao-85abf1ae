
-- Storage bucket for template media (hero videos, cover photos, thumbnails)
INSERT INTO storage.buckets (id, name, public) VALUES ('display-media', 'display-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for display-media bucket
CREATE POLICY "Anyone can view display media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'display-media');

CREATE POLICY "Authenticated users can upload display media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'display-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own display media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'display-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own display media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'display-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Templates available for purchase
CREATE TABLE public.display_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  preview_url TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  template_key TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.display_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active templates"
  ON public.display_templates FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage templates"
  ON public.display_templates FOR ALL
  USING (is_admin());

-- User purchased templates
CREATE TABLE public.user_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_id UUID NOT NULL REFERENCES display_templates(id),
  order_id UUID REFERENCES orders(id),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, template_id)
);

ALTER TABLE public.user_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates"
  ON public.user_templates FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "System can insert user templates"
  ON public.user_templates FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage user templates"
  ON public.user_templates FOR ALL
  USING (is_admin());

-- Add template fields to business_displays
ALTER TABLE public.business_displays
  ADD COLUMN IF NOT EXISTS active_template_id UUID REFERENCES display_templates(id),
  ADD COLUMN IF NOT EXISTS template_config JSONB DEFAULT '{}'::jsonb;

-- Seed the Netflix template
INSERT INTO public.display_templates (name, description, template_key, price, features, preview_url)
VALUES (
  'Netflix Premium',
  'Template estilo streaming com hero em destaque, carrossel de conteúdo e thumbnails interativos. Perfeito para portfolios e catálogos visuais.',
  'netflix',
  29.90,
  '["Hero com vídeo ou imagem", "Carrossel de fotos de capa", "Grid de thumbnails", "Layout responsivo", "Animações suaves"]'::jsonb,
  NULL
);

-- Trigger for updated_at
CREATE TRIGGER update_display_templates_updated_at
  BEFORE UPDATE ON public.display_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
