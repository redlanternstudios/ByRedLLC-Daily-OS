-- Migration: 20260629_profile_avatars_storage
-- User profile pictures for ByRedLLC OS.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Profile avatars are publicly readable'
  ) THEN
    CREATE POLICY "Profile avatars are publicly readable"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'profile-avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload their own profile avatar'
  ) THEN
    CREATE POLICY "Users can upload their own profile avatar"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'profile-avatars'
        AND auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can update their own profile avatar'
  ) THEN
    CREATE POLICY "Users can update their own profile avatar"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'profile-avatars'
        AND auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
      WITH CHECK (
        bucket_id = 'profile-avatars'
        AND auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete their own profile avatar'
  ) THEN
    CREATE POLICY "Users can delete their own profile avatar"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'profile-avatars'
        AND auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;
