-- Drop existing function if it exists
DROP FUNCTION IF EXISTS check_user_is_admin(uuid);

-- Create the admin check function with correct parameter name
CREATE OR REPLACE FUNCTION check_user_is_admin(input_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.user_id = input_user_id 
    AND (admin_users.is_active IS NULL OR admin_users.is_active = true)
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_user_is_admin(UUID) TO authenticated;

-- Fix sheet permissions policies
DROP POLICY IF EXISTS "Users can view their sheet permissions" ON sheet_permissions;
DROP POLICY IF EXISTS "Users can manage sheet permissions" ON sheet_permissions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON sheet_permissions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON sheet_permissions;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON sheet_permissions;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON sheet_permissions;

CREATE POLICY "sheet_permissions_select" ON sheet_permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "sheet_permissions_insert" ON sheet_permissions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "sheet_permissions_update" ON sheet_permissions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "sheet_permissions_delete" ON sheet_permissions
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Ensure profiles table has proper RLS
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT USING (true);

-- Function to add sheet permission
CREATE OR REPLACE FUNCTION add_sheet_permission(
  p_sheet_id UUID,
  p_user_id UUID,
  p_permission_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO sheet_permissions (sheet_id, user_id, permission_type)
  VALUES (p_sheet_id, p_user_id, p_permission_type);
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Function to remove sheet permission
CREATE OR REPLACE FUNCTION remove_sheet_permission(p_permission_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM sheet_permissions WHERE id = p_permission_id;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Function to update sheet permission
CREATE OR REPLACE FUNCTION update_sheet_permission(
  p_permission_id UUID,
  p_permission_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE sheet_permissions 
  SET permission_type = p_permission_type
  WHERE id = p_permission_id;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Grant permissions for all functions
GRANT EXECUTE ON FUNCTION add_sheet_permission(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_sheet_permission(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_sheet_permission(UUID, TEXT) TO authenticated;
