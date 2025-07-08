-- Drop existing permissions tables if they exist
DROP TABLE IF EXISTS sheet_permissions CASCADE;
DROP TABLE IF EXISTS sheet_user_permissions CASCADE;

-- Create the new sheet access system
CREATE TABLE IF NOT EXISTS sheet_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL CHECK (access_level IN ('viewer', 'editor', 'admin')),
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  UNIQUE(sheet_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sheet_access_sheet_id ON sheet_access(sheet_id);
CREATE INDEX IF NOT EXISTS idx_sheet_access_user_id ON sheet_access(user_id);
CREATE INDEX IF NOT EXISTS idx_sheet_access_active ON sheet_access(is_active);
CREATE INDEX IF NOT EXISTS idx_sheet_access_level ON sheet_access(access_level);

-- Enable RLS
ALTER TABLE sheet_access ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "sheet_access_select_policy" ON sheet_access;
DROP POLICY IF EXISTS "sheet_access_insert_policy" ON sheet_access;
DROP POLICY IF EXISTS "sheet_access_update_policy" ON sheet_access;
DROP POLICY IF EXISTS "sheet_access_delete_policy" ON sheet_access;

-- Create RLS policies
CREATE POLICY "sheet_access_select_policy" ON sheet_access
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM sheet_access sa 
        WHERE sa.sheet_id = sheet_access.sheet_id 
        AND sa.user_id = auth.uid() 
        AND sa.access_level IN ('admin', 'editor')
        AND sa.is_active = true
      ) OR
      EXISTS (
        SELECT 1 FROM sheets s 
        WHERE s.id = sheet_access.sheet_id 
        AND s.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "sheet_access_insert_policy" ON sheet_access
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM sheets s 
        WHERE s.id = sheet_id 
        AND s.owner_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM sheet_access sa 
        WHERE sa.sheet_id = sheet_access.sheet_id 
        AND sa.user_id = auth.uid() 
        AND sa.access_level = 'admin'
        AND sa.is_active = true
      )
    )
  );

CREATE POLICY "sheet_access_update_policy" ON sheet_access
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM sheets s 
        WHERE s.id = sheet_id 
        AND s.owner_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM sheet_access sa 
        WHERE sa.sheet_id = sheet_access.sheet_id 
        AND sa.user_id = auth.uid() 
        AND sa.access_level = 'admin'
        AND sa.is_active = true
      )
    )
  );

CREATE POLICY "sheet_access_delete_policy" ON sheet_access
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM sheets s 
        WHERE s.id = sheet_id 
        AND s.owner_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM sheet_access sa 
        WHERE sa.sheet_id = sheet_access.sheet_id 
        AND sa.user_id = auth.uid() 
        AND sa.access_level = 'admin'
        AND sa.is_active = true
      )
    )
  );

-- Grant permissions
GRANT ALL ON sheet_access TO authenticated;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS check_sheet_access(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS grant_sheet_access(UUID, TEXT, TEXT, UUID, TIMESTAMP WITH TIME ZONE, TEXT);
DROP FUNCTION IF EXISTS revoke_sheet_access(UUID, UUID);

-- Create helper functions
CREATE OR REPLACE FUNCTION check_sheet_access(
  p_sheet_id UUID,
  p_user_id UUID,
  p_required_level TEXT DEFAULT 'viewer'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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
