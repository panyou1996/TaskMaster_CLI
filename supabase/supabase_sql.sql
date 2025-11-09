-- 1. Create "notes" table IF IT DOESN'T EXIST
-- This avoids the "relation already exists" error.
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  title TEXT,
  content TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}'::text[],
  status TEXT DEFAULT 'synced' -- ADDED: status column
);

-- Drop existing policies to ensure they can be recreated or updated without conflict.
-- This makes the script re-runnable.
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can upload attachments to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;

-- 2. Enable RLS (this is safe to re-run, it has no effect if already enabled)
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 3. Recreate RLS policy for the notes table
CREATE POLICY "Users can manage their own notes"
ON public.notes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Create or replace the function to auto-update 'updated_at' (already idempotent)
CREATE OR REPLACE FUNCTION public.handle_note_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Drop and recreate the trigger to ensure it's correctly configured
DROP TRIGGER IF EXISTS on_note_updated ON public.notes;
CREATE TRIGGER on_note_updated
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.handle_note_updated_at();

-- 6. Create the storage bucket if it doesn't exist (already idempotent due to ON CONFLICT)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('notes_attachments', 'notes_attachments', false, null, null)
ON CONFLICT (id) DO NOTHING;

-- 7. Recreate RLS policies for the storage bucket, now including update and delete permissions
CREATE POLICY "Users can upload attachments to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'notes_attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'notes_attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ADDED: Allow users to update their own attachments (e.g., overwrite)
CREATE POLICY "Users can update their own attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'notes_attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ADDED: Allow users to delete their own attachments
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'notes_attachments' AND (storage.foldername(name))[1] = auth.uid()::text);