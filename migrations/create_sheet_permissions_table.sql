-- Create sheet_permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS sheet_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('read', 'write', 'admin')),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE(sheet_id, user_id)
);

-- Enable RLS
ALTER TABLE sheet_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "sheet_permissions_select" ON sheet_permissions;
DROP POLICY IF EXISTS "sheet_permissions_insert" ON sheet_permissions;
DROP POLICY IF EXISTS "sheet_permissions_update" ON sheet_permissions;
DROP POLICY IF EXISTS "sheet_permissions_delete" ON sheet_permissions;

CREATE POLICY "sheet_permissions_select" ON sheet_permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "sheet_permissions_insert" ON sheet_permissions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "sheet_permissions_update" ON sheet_permissions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "sheet_permissions_delete" ON sheet_permissions
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sheet_permissions_sheet_id ON sheet_permissions(sheet_id);
CREATE INDEX IF NOT EXISTS idx_sheet_permissions_user_id ON sheet_permissions(user_id);

-- Grant permissions
GRANT ALL ON sheet_permissions TO authenticated;
