-- Add languages column to existing profiles table
-- Shape: [{ language, proficiency }]
-- proficiency is one of: "Native", "Fluent", "Advanced", "Intermediate", "Basic"

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]'::jsonb;
