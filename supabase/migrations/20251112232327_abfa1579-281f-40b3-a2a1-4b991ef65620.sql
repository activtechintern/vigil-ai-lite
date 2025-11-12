-- Create storage bucket for reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for reports bucket
CREATE POLICY "Users can upload their own reports"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'reports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own reports"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'reports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Reports are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'reports');