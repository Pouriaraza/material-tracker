-- Create a function to set a user as admin
CREATE OR REPLACE FUNCTION public.set_user_as_admin(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  result JSONB;
BEGIN
  -- Try to find the user in auth.users
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;
  
  IF user_id IS NULL THEN
    -- User doesn't exist
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  
  -- Check if user is already an admin
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = user_id AND name = 'admin') THEN
    RETURN jsonb_build_object('success', true, 'message', 'User is already an admin');
  END IF;
  
  -- Add admin role
  INSERT INTO public.user_roles (user_id, name, description)
  VALUES (user_id, 'admin', 'Administrator with full access');
  
  RETURN jsonb_build_object('success', true, 'message', 'Admin role assigned successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_user_as_admin(TEXT) TO authenticated;
