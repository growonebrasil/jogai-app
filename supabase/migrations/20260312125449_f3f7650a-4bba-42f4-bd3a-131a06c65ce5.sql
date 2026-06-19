
-- Create storage bucket for feed media (photos/videos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('feed_media', 'feed_media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to feed_media
CREATE POLICY "Authenticated users can upload feed media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'feed_media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access to feed_media
CREATE POLICY "Anyone can view feed media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'feed_media');

-- Allow users to delete their own feed media
CREATE POLICY "Users can delete own feed media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'feed_media' AND (storage.foldername(name))[1] = auth.uid()::text);
