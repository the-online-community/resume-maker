-- Add projects column to existing profiles table
-- Shape: [{ name, stack, description }]
-- stack is a comma-separated string, e.g. "React, Node.js, PostgreSQL"

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]'::jsonb;
