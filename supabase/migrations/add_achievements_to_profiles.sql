-- Drop unused achievements column from profiles table
-- The achievement field lives inside the education JSONB array, not as a top-level column

ALTER TABLE profiles DROP COLUMN IF EXISTS achievements;
