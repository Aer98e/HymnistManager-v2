-- ========================================================
-- HYMN LIST MANAGER - SCHEMA DDL FOR SUPABASE (POSTGRESQL)
-- Fully Idempotent Script (Can be re-run safely multiple times)
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. LANGUAGES
CREATE TABLE IF NOT EXISTS public.languages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation VARCHAR(10) NOT NULL
);

-- Seed initial languages
INSERT INTO public.languages (name, abbreviation) VALUES ('Español', 'ES'), ('English', 'EN') ON CONFLICT DO NOTHING;

-- 2. HYMNS (Global & Private)
CREATE TABLE IF NOT EXISTS public.hymns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_es TEXT NOT NULL,
  title_original TEXT,
  composer TEXT,
  first_line TEXT,
  refrain_first_line TEXT,
  type VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (type IN ('public', 'private')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hymns ADD COLUMN IF NOT EXISTS first_line TEXT;
ALTER TABLE public.hymns ADD COLUMN IF NOT EXISTS refrain_first_line TEXT;


-- 3. HYMNALS
CREATE TABLE IF NOT EXISTS public.hymnals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (type IN ('private', 'pending', 'rejected', 'public')),
  rejection_reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  language_id BIGINT REFERENCES public.languages(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hymnals ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 4. HYMNAL_HYMN
CREATE TABLE IF NOT EXISTS public.hymnal_hymn (
  hymnal_id UUID REFERENCES public.hymnals(id) ON DELETE CASCADE,
  hymn_id UUID REFERENCES public.hymns(id) ON DELETE CASCADE,
  number INT NOT NULL,
  PRIMARY KEY (hymnal_id, hymn_id)
);

-- 5. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT unique_name_per_creator UNIQUE NULLS NOT DISTINCT (name, created_by)
);

-- 6. CATEGORY_HYMN
CREATE TABLE IF NOT EXISTS public.category_hymn (
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  hymn_id UUID REFERENCES public.hymns(id) ON DELETE CASCADE,
  PRIMARY KEY (category_id, hymn_id)
);

-- 7. NOTES (Lookup table for keys & notes)
CREATE TABLE IF NOT EXISTS public.notes (
  id INT PRIMARY KEY,
  name_es VARCHAR(10) NOT NULL,
  name_en VARCHAR(10) NOT NULL
);

INSERT INTO public.notes (id, name_es, name_en) VALUES 
  (1, 'Do', 'C'), (2, 'Do#', 'C#'), (3, 'Re', 'D'), (4, 'Mib', 'Eb'), 
  (5, 'Mi', 'E'), (6, 'Fa', 'F'), (7, 'Fa#', 'F#'), (8, 'Sol', 'G'), 
  (9, 'Sol#', 'G#'), (10, 'La', 'A'), (11, 'Sib', 'Bb'), (12, 'Si', 'B'),
  (13, 'Reb', 'Db'), (14, 'Re#', 'D#'), (15, 'Solb', 'Gb'), (16, 'Lab', 'Ab'),
  (17, 'La#', 'A#')
ON CONFLICT DO NOTHING;

-- 8. USER PREFERENCES (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  preferred_hymnal_id UUID REFERENCES public.hymnals(id) ON DELETE SET NULL,
  new_hymn_threshold INT DEFAULT 5
);
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS preferred_hymnal_id UUID REFERENCES public.hymnals(id) ON DELETE SET NULL;


-- 9. CONTEXTS
CREATE TABLE IF NOT EXISTS public.contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  new_hymns_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. PROGRAMS
CREATE TABLE IF NOT EXISTS public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id UUID NOT NULL REFERENCES public.contexts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. PROGRAM_HYMN
CREATE TABLE IF NOT EXISTS public.program_hymn (
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  hymn_id UUID REFERENCES public.hymns(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  PRIMARY KEY (program_id, hymn_id)
);

-- 12. USER_HYMN (Custom musical attributes per user)
CREATE TABLE IF NOT EXISTS public.user_hymn (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  hymn_id UUID REFERENCES public.hymns(id) ON DELETE CASCADE,
  key_id INT REFERENCES public.notes(id),
  key_mode VARCHAR(10) DEFAULT 'major' CHECK (key_mode IN ('major', 'minor')),
  highest_note_id INT REFERENCES public.notes(id),
  highest_octave INT,
  lowest_note_id INT REFERENCES public.notes(id),
  lowest_octave INT,
  has_modulation BOOLEAN DEFAULT false,
  energy INT CHECK (energy BETWEEN 1 AND 5),
  PRIMARY KEY (user_id, hymn_id)
);
ALTER TABLE public.user_hymn ADD COLUMN IF NOT EXISTS key_mode VARCHAR(10) DEFAULT 'major' CHECK (key_mode IN ('major', 'minor'));

-- ========================================================
-- VIEWS FOR DYNAMIC ANALYTICS
-- ========================================================

-- View: Historical usage count and last date used per context up to current date
CREATE OR REPLACE VIEW public.v_hymn_usage_stats AS
SELECT 
    c.user_id,
    p.context_id,
    ph.hymn_id,
    COUNT(p.id) AS total_uses,
    MAX(p.date) AS last_used_at
FROM public.programs p
JOIN public.program_hymn ph ON ph.program_id = p.id
JOIN public.contexts c ON c.id = p.context_id
WHERE p.date <= CURRENT_DATE
GROUP BY c.user_id, p.context_id, ph.hymn_id;

-- View: Active new hymns per context (dynamically filtered by user preference threshold)
CREATE OR REPLACE VIEW public.v_active_new_hymns AS
SELECT 
    c.user_id,
    c.id AS context_id,
    ch.hymn_id,
    COALESCE(us.total_uses, 0) AS usage_count,
    up.new_hymn_threshold
FROM public.contexts c
JOIN public.category_hymn ch ON ch.category_id = c.new_hymns_category_id
JOIN public.user_preferences up ON up.user_id = c.user_id
LEFT JOIN public.v_hymn_usage_stats us ON us.context_id = c.id AND us.hymn_id = ch.hymn_id
WHERE COALESCE(us.total_uses, 0) < up.new_hymn_threshold;

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

ALTER TABLE public.hymns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hymnals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_hymn ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hymnal_hymn ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_hymn ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_hymn ENABLE ROW LEVEL SECURITY;

-- 1. HYMNS POLICIES
DROP POLICY IF EXISTS "Public hymns viewable" ON public.hymns;
DROP POLICY IF EXISTS "Public hymns are viewable by all users" ON public.hymns;
CREATE POLICY "Public hymns viewable" ON public.hymns 
  FOR SELECT USING (type = 'public' OR created_by = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Users can create hymns" ON public.hymns;
CREATE POLICY "Users can create hymns" ON public.hymns 
  FOR INSERT WITH CHECK (auth.uid() = created_by OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Users can update own hymns" ON public.hymns;
CREATE POLICY "Users can update own hymns" ON public.hymns 
  FOR UPDATE USING (created_by = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Users can delete own hymns" ON public.hymns;
CREATE POLICY "Users can delete own hymns" ON public.hymns 
  FOR DELETE USING (created_by = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');


-- 2. HYMNALS POLICIES
DROP POLICY IF EXISTS "Public hymnals viewable" ON public.hymnals;
DROP POLICY IF EXISTS "Public hymnals are viewable by all" ON public.hymnals;
CREATE POLICY "Public hymnals viewable" ON public.hymnals 
  FOR SELECT USING (type = 'public' OR created_by = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Users can create own hymnals" ON public.hymnals;
CREATE POLICY "Users can create own hymnals" ON public.hymnals 
  FOR INSERT WITH CHECK (auth.uid() = created_by OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Users can update own hymnals" ON public.hymnals;
CREATE POLICY "Users can update own hymnals" ON public.hymnals 
  FOR UPDATE USING (created_by = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Users can delete own hymnals" ON public.hymnals;
CREATE POLICY "Users can delete own hymnals" ON public.hymnals 
  FOR DELETE USING (created_by = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');


-- 3. HYMNAL_HYMN (JUNCTION) POLICIES
DROP POLICY IF EXISTS "Hymnal hymn viewable if hymnal is accessible" ON public.hymnal_hymn;
DROP POLICY IF EXISTS "Hymnal hymn manageable by owner or admin" ON public.hymnal_hymn;
CREATE POLICY "Hymnal hymn manageable by owner or admin" ON public.hymnal_hymn 
  FOR ALL USING (
    hymnal_id IN (SELECT id FROM public.hymnals WHERE created_by = auth.uid() OR type = 'public' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  )
  WITH CHECK (
    hymnal_id IN (SELECT id FROM public.hymnals WHERE created_by = auth.uid() OR type = 'public' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  );


-- 4. CATEGORIES POLICIES
DROP POLICY IF EXISTS "Global and user categories viewable" ON public.categories;
CREATE POLICY "Global and user categories viewable" ON public.categories 
  FOR SELECT USING (created_by IS NULL OR created_by = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
CREATE POLICY "Users can insert own categories" ON public.categories 
  FOR INSERT WITH CHECK (created_by = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Users can update delete own categories" ON public.categories;
CREATE POLICY "Users can update delete own categories" ON public.categories 
  FOR ALL USING (created_by = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');


-- 5. USER PREFERENCES POLICIES
DROP POLICY IF EXISTS "User manages own preferences" ON public.user_preferences;
CREATE POLICY "User manages own preferences" ON public.user_preferences 
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- 6. CONTEXTS POLICIES
DROP POLICY IF EXISTS "User manages own contexts" ON public.contexts;
CREATE POLICY "User manages own contexts" ON public.contexts 
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- 7. PROGRAMS POLICIES
DROP POLICY IF EXISTS "User manages own programs" ON public.programs;
CREATE POLICY "User manages own programs" ON public.programs 
  FOR ALL USING (context_id IN (SELECT id FROM public.contexts WHERE user_id = auth.uid()))
  WITH CHECK (context_id IN (SELECT id FROM public.contexts WHERE user_id = auth.uid()));


-- 8. USER HYMN POLICIES
DROP POLICY IF EXISTS "User manages own hymn attributes" ON public.user_hymn;
CREATE POLICY "User manages own hymn attributes" ON public.user_hymn 
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- 9. PROGRAM HYMN POLICIES
DROP POLICY IF EXISTS "Program hymn manageable by context owner" ON public.program_hymn;
CREATE POLICY "Program hymn manageable by context owner" ON public.program_hymn 
  FOR ALL USING (
    program_id IN (SELECT p.id FROM public.programs p JOIN public.contexts c ON c.id = p.context_id WHERE c.user_id = auth.uid())
  )
  WITH CHECK (
    program_id IN (SELECT p.id FROM public.programs p JOIN public.contexts c ON c.id = p.context_id WHERE c.user_id = auth.uid())
  );


-- 10. CATEGORY HYMN POLICIES
DROP POLICY IF EXISTS "Category hymn manageable by category owner" ON public.category_hymn;
CREATE POLICY "Category hymn manageable by category owner" ON public.category_hymn 
  FOR ALL USING (
    category_id IN (SELECT id FROM public.categories WHERE created_by = auth.uid() OR created_by IS NULL OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  )
  WITH CHECK (
    category_id IN (SELECT id FROM public.categories WHERE created_by = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  );


-- Trigger for auto-creating user_preferences on Auth user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id, full_name, new_hymn_threshold)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    5
  )
  ON CONFLICT (user_id) DO UPDATE 
    SET full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
