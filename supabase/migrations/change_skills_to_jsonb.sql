-- Change skills from TEXT[] (flat array) to JSONB (grouped object)
-- e.g. { "Languages": ["JavaScript", "TypeScript"], "Frontend": ["React", "Next.js"] }
-- Migrate existing data: wrap old array values into { "General": [...] }

ALTER TABLE profiles
  ALTER COLUMN skills DROP DEFAULT,
  ALTER COLUMN skills TYPE JSONB USING
    CASE
      WHEN skills IS NULL OR array_length(skills, 1) IS NULL THEN '{}'::jsonb
      ELSE jsonb_build_object('General', to_jsonb(skills))
    END,
  ALTER COLUMN skills SET DEFAULT '{}'::jsonb;
