
CREATE POLICY "staff_all_media_bucket" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'media' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'media' AND public.is_staff(auth.uid()));

CREATE POLICY "staff_all_imports_bucket" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'imports' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'imports' AND public.is_staff(auth.uid()));
