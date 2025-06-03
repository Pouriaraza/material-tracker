-- First, check if the user exists in auth.users
-- If not, we'll need to create them in the auth system first
-- For now, let's just insert the admin role for an existing user

-- Insert admin role for user with email pouria.raz@mtnirancell.ir
-- First, we need to find the user ID
WITH user_id_query AS (
  SELECT id FROM auth.users WHERE email = 'pouria.raz@mtnirancell.ir'
)
INSERT INTO user_roles (id, user_id, name, description, created_at)
SELECT 
  gen_random_uuid(), 
  id, 
  'admin', 
  'Administrator', 
  NOW()
FROM user_id_query
ON CONFLICT (user_id, name) DO NOTHING;
