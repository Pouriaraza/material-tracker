-- Remove all existing sheet permissions tables and functions
DROP TABLE IF EXISTS sheet_permissions CASCADE;
DROP FUNCTION IF EXISTS add_sheet_permission(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS remove_sheet_permission(UUID);
DROP FUNCTION IF EXISTS update_sheet_permission(UUID, TEXT);
DROP FUNCTION IF EXISTS check_sheet_access(UUID, UUID);

-- Clean up any orphaned policies
DROP POLICY IF EXISTS "sheet_permissions_select" ON sheet_permissions;
DROP POLICY IF EXISTS "sheet_permissions_insert" ON sheet_permissions;
DROP POLICY IF EXISTS "sheet_permissions_update" ON sheet_permissions;
DROP POLICY IF EXISTS "sheet_permissions_delete" ON sheet_permissions;
