-- Create storage bucket for bio page images
INSERT INTO storage.buckets (id, name, public)
VALUES ('bio-images', 'bio-images', true);

-- RLS policy for viewing images (public)
CREATE POLICY "Bio images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'bio-images');

-- RLS policy for uploading images (authenticated users only)
CREATE POLICY "Users can upload bio images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'bio-images' 
  AND auth.uid() IS NOT NULL
);

-- RLS policy for updating images (owner only)
CREATE POLICY "Users can update own bio images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'bio-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policy for deleting images (owner only)
CREATE POLICY "Users can delete own bio images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'bio-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);