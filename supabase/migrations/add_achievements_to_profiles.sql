-- Add achievements column to existing profiles table
-- Shape: [{ id, description, impact, technologies, context, source }]
-- source is one of: "manual", "ai-import", "resume-import"

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]'::jsonb;
