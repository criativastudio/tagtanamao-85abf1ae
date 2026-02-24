
ALTER TABLE public.site_sections
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS media_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('site-videos', 'site-videos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload site videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'site-videos' AND public.is_admin());

CREATE POLICY "Admins can update site videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'site-videos' AND public.is_admin());

CREATE POLICY "Admins can delete site videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'site-videos' AND public.is_admin());

CREATE POLICY "Anyone can view site videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-videos');
