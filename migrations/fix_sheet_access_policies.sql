-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "sheet_access_select_policy" ON sheet_access;
DROP POLICY IF EXISTS "sheet_access_insert_policy" ON sheet_access;
DROP POLICY IF EXISTS "sheet_access_update_policy" ON sheet_access;
DROP POLICY IF EXISTS "sheet_access_delete_policy" ON sheet_access;

-- Drop existing sheet policies
DROP POLICY IF EXISTS "sheets_select_policy" ON sheets;
DROP POLICY IF EXISTS "sheets_insert_policy" ON sheets;
DROP POLICY IF EXISTS "sheets_update_policy" ON sheets;
DROP POLICY IF EXISTS "sheets_delete_policy" ON sheets;

-- Create simple, non-recursive RLS policies for sheet_access
CREATE POLICY "sheet_access_select_policy" ON sheet_access
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM sheets s 
        WHERE s.id = sheet_access.sheet_id 
        AND s.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "sheet_access_insert_policy" ON sheet_access
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM sheets s 
      WHERE s.id = sheet_id 
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "sheet_access_update_policy" ON sheet_access
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM sheets s 
      WHERE s.id = sheet_id 
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "sheet_access_delete_policy" ON sheet_access
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM sheets s 
      WHERE s.id = sheet_id 
      AND s.owner_id = auth.uid()
    )
  );

-- Create simple RLS policies for sheets table
CREATE POLICY "sheets_select_policy" ON sheets
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM sheet_access sa
        WHERE sa.sheet_id = sheets.id 
        AND sa.user_id = auth.uid() 
        AND sa.is_active = true
        AND (sa.expires_at IS NULL OR sa.expires_at > NOW())
      )
    )
  );

CREATE POLICY "sheets_insert_policy" ON sheets
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND owner_id = auth.uid()
  );

CREATE POLICY "sheets_update_policy" ON sheets
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND owner_id = auth.uid()
  );

CREATE POLICY "sheets_delete_policy" ON sheets
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND owner_id = auth.uid()
  );

-- Update the helper functions with proper search path
CREATE OR REPLACE FUNCTION check_sheet_access(
  p_sheet_id UUID,
  p_user_id UUID,
  p_required_level TEXT DEFAULT 'viewer'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_access_level TEXT;
  is_owner BOOLEAN;
BEGIN
  -- Check if user is the sheet owner
  SELECT EXISTS(
    SELECT 1 FROM sheets 
    WHERE id = p_sheet_id AND owner_id = p_user_id
  ) INTO is_owner;
  
  IF is_owner THEN
    RETURN true;
  END IF;
  
  -- Check user's access level
  SELECT access_level INTO user_access_level
  FROM sheet_access
  WHERE sheet_id = p_sheet_id 
    AND user_id = p_user_id 
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF user_access_level IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has required access level
  CASE p_required_level
    WHEN 'viewer' THEN
      RETURN user_access_level IN ('viewer', 'editor', 'admin');
    WHEN 'editor' THEN
      RETURN user_access_level IN ('editor', 'admin');
    WHEN 'admin' THEN
      RETURN user_access_level = 'admin';
    ELSE
      RETURN false;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION grant_sheet_access(
  p_sheet_id UUID,
  p_user_email TEXT,
  p_access_level TEXT,
  p_granted_by UUID,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  access_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id
  FROM profiles
  WHERE email = LOWER(TRIM(p_user_email));
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', p_user_email;
  END IF;
  
  -- Insert or update access
  INSERT INTO sheet_access (
    sheet_id, user_id, access_level, granted_by, expires_at, notes
  )
  VALUES (
    p_sheet_id, target_user_id, p_access_level, p_granted_by, p_expires_at, p_notes
  )
  ON CONFLICT (sheet_id, user_id)
  DO UPDATE SET
    access_level = EXCLUDED.access_level,
    granted_by = EXCLUDED.granted_by,
    granted_at = NOW(),
    expires_at = EXCLUDED.expires_at,
    notes = EXCLUDED.notes,
    is_active = true
  RETURNING id INTO access_id;
  
  RETURN access_id;
END;
$$;

CREATE OR REPLACE FUNCTION revoke_sheet_access(
  p_sheet_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE sheet_access
  SET is_active = false
  WHERE sheet_id = p_sheet_id AND user_id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION check_sheet_access(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_sheet_access(UUID, TEXT, TEXT, UUID, TIMESTAMP WITH TIME ZONE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_sheet_access(UUID, UUID) TO authenticated;
