-- ========================================================
-- HYMN LIST MANAGER - MIGRATION: BUSINESS LOGIC RULES
-- ========================================================

-- 1. Trigger to prevent demoting a public hymn to private
CREATE OR REPLACE FUNCTION public.prevent_hymn_public_demotion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.type = 'public' AND NEW.type = 'private' THEN
    RAISE EXCEPTION 'A public hymn cannot be demoted back to private.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_hymn_public_demotion ON public.hymns;
CREATE TRIGGER trg_prevent_hymn_public_demotion
  BEFORE UPDATE ON public.hymns
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_hymn_public_demotion();

-- 2. Update RLS policies for hymns table
-- Regular users can only UPDATE their own PRIVATE hymns. Admins can update any hymn.
DROP POLICY IF EXISTS "Users can update own hymns" ON public.hymns;
CREATE POLICY "Users can update own private hymns or admin" ON public.hymns 
  FOR UPDATE USING (
    (created_by = auth.uid() AND type = 'private') 
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Regular users can only DELETE their own PRIVATE hymns. Admins can delete any hymn.
DROP POLICY IF EXISTS "Users can delete own hymns" ON public.hymns;
CREATE POLICY "Users can delete own private hymns or admin" ON public.hymns 
  FOR DELETE USING (
    (created_by = auth.uid() AND type = 'private') 
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- 3. SQL Views for Loose Hymns ("Himnos Sueltos")

-- View: User's Private Loose Hymns
CREATE OR REPLACE VIEW public.v_user_loose_hymns AS
SELECT h.*
FROM public.hymns h
WHERE h.type = 'private'
  AND NOT EXISTS (
    SELECT 1 FROM public.hymnal_hymn hh WHERE hh.hymn_id = h.id
  );

-- View: Public Loose Hymns
CREATE OR REPLACE VIEW public.v_public_loose_hymns AS
SELECT h.*
FROM public.hymns h
WHERE h.type = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM public.hymnal_hymn hh WHERE hh.hymn_id = h.id
  );

-- 4. Grants for Supabase roles & Notes RLS policy
DROP POLICY IF EXISTS "Notes viewable by all" ON public.notes;
CREATE POLICY "Notes viewable by all" ON public.notes 
  FOR SELECT USING (true);

GRANT SELECT ON public.notes TO authenticated, anon;
GRANT SELECT ON public.v_user_loose_hymns TO authenticated, anon;
GRANT SELECT ON public.v_public_loose_hymns TO authenticated, anon;


