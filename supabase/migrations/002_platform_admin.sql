-- Add platform admin flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT FALSE;

-- Make your account a platform admin (replace with your email)
-- Run this after signing up:
-- UPDATE profiles SET is_platform_admin = TRUE
-- WHERE email = 'your@email.com';
