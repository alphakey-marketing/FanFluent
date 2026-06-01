-- IdolLearn MVP — Initial Schema
-- Run these SQL statements in the Supabase SQL Editor

-- ============================================================
-- 1. PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT,
  display_name   TEXT,
  tier           TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'paid' | 'admin'
  ls_customer_id TEXT,
  ls_order_id    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- 2. POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idol_id         TEXT NOT NULL DEFAULT 'takeda_kouhei',
  source_platform TEXT NOT NULL,              -- 'x' | 'instagram'
  source_url      TEXT,
  original_text   TEXT NOT NULL,
  post_date       TIMESTAMPTZ,
  image_url       TEXT,
  tags            TEXT[],
  status          TEXT DEFAULT 'pending',     -- 'pending' | 'processed' | 'published'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  imported_by     UUID REFERENCES profiles(id)
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read published posts" ON posts
  FOR SELECT USING (auth.role() = 'authenticated' AND status = 'published');

CREATE POLICY "Admin can do everything on posts" ON posts
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tier = 'admin'
    )
  );

-- ============================================================
-- 3. POST ANALYSIS
-- ============================================================
CREATE TABLE IF NOT EXISTS post_analysis (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id          UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  summary          TEXT NOT NULL,
  full_translation TEXT,
  vocab_breakdown  JSONB,
  culture_notes    TEXT,
  grammar_notes    TEXT,
  language_origin  TEXT,
  model_used       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (post_id)
);

ALTER TABLE post_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read analysis" ON post_analysis
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage analysis" ON post_analysis
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tier = 'admin'
    )
  );
