-- Drop all existing RLS policies
DROP POLICY IF EXISTS "sheet_access_select_policy" ON sheet_access;
DROP POLICY IF EXISTS "sheet_access_insert_policy" ON sheet_access;
DROP POLICY IF EXISTS "sheet_access_update_policy" ON sheet_access;
DROP POLICY IF EXISTS "sheet_access_delete_policy" ON sheet_access;
DROP POLICY IF EXISTS "sheets_select_policy" ON sheets;
DROP POLICY IF EXISTS "sheets_insert_policy" ON sheets;
DROP POLICY IF EXISTS "sheets_update_policy" ON sheets;
DROP POLICY IF EXISTS "sheets_delete_policy" ON sheets;

-- Create completely open RLS policies for sheets
CREATE POLICY "sheets_open_select" ON sheets
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "sheets_open_insert" ON sheets
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "sheets_open_update" ON sheets
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Only owners can delete sheets
CREATE POLICY "sheets_owner_delete" ON sheets
  FOR DELETE USING (auth.uid() IS NOT NULL AND owner_id = auth.uid());

-- Create open policies for columns
DROP POLICY IF EXISTS "columns_select_policy" ON columns;
DROP POLICY IF EXISTS "columns_insert_policy" ON columns;
DROP POLICY IF EXISTS "columns_update_policy" ON columns;
DROP POLICY IF EXISTS "columns_delete_policy" ON columns;

CREATE POLICY "columns_open_select" ON columns
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "columns_open_insert" ON columns
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "columns_open_update" ON columns
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "columns_open_delete" ON columns
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create open policies for rows
DROP POLICY IF EXISTS "rows_select_policy" ON rows;
DROP POLICY IF EXISTS "rows_insert_policy" ON rows;
DROP POLICY IF EXISTS "rows_update_policy" ON rows;
DROP POLICY IF EXISTS "rows_delete_policy" ON rows;

CREATE POLICY "rows_open_select" ON rows
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "rows_open_insert" ON rows
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "rows_open_update" ON rows
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "rows_open_delete" ON rows
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create open policies for cells
DROP POLICY IF EXISTS "cells_select_policy" ON cells;
DROP POLICY IF EXISTS "cells_insert_policy" ON cells;
DROP POLICY IF EXISTS "cells_update_policy" ON cells;
DROP POLICY IF EXISTS "cells_delete_policy" ON cells;

CREATE POLICY "cells_open_select" ON cells
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "cells_open_insert" ON cells
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "cells_open_update" ON cells
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "cells_open_delete" ON cells
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Enable RLS on all tables
ALTER TABLE sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE cells ENABLE ROW LEVEL SECURITY;

-- Drop the sheet_access table since we don't need permissions anymore
DROP TABLE IF EXISTS sheet_access CASCADE;

-- Create a simple function to get user email from auth.users
CREATE OR REPLACE FUNCTION get_user_email(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id;
  
  RETURN COALESCE(user_email, 'Unknown User');
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_email(UUID) TO authenticated;
