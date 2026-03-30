-- ─────────────────────────────────────────────────────────────────────────────
-- profiles table
-- Stores the user's personal info, links, skills, experience, and education.
-- This acts as a persistent "base layer" the AI always reads from when
-- generating or tailoring a resume — regardless of whether a PDF is uploaded.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  user_id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Contact / header fields (mirrors template header toggles)
  full_name TEXT,
  email     TEXT,
  phone     TEXT,
  location  TEXT,
  linkedin  TEXT,
  github    TEXT,
  website   TEXT,

  -- Skills: simple ordered list, e.g. ["React", "TypeScript", "Node.js"]
  skills    TEXT[] DEFAULT '{}',

  -- Experience entries (no bullet descriptions — just the facts)
  -- Shape: [{ title, company, location, start_date, end_date }]
  experience JSONB DEFAULT '[]'::jsonb,

  -- Education entries
  -- Shape: [{ degree, institution, year }]
  education  JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ── Auto-update updated_at on every row change ────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
