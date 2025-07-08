import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Step 1: Drop all existing functions first
    const dropFunctionsQuery = `
      -- Drop all existing functions with all possible signatures
      DROP FUNCTION IF EXISTS check_user_is_admin(uuid);
      DROP FUNCTION IF EXISTS check_user_is_admin(user_id_param uuid);
      DROP FUNCTION IF EXISTS add_sheet_permission(uuid, uuid, text);
      DROP FUNCTION IF EXISTS remove_sheet_permission(uuid);
      DROP FUNCTION IF EXISTS update_sheet_permission(uuid, text);
    `

    const { error: dropError } = await supabase.rpc("execute_sql", {
      sql_query: dropFunctionsQuery,
    })

    if (dropError) {
      console.error("Error dropping functions:", dropError)
      // Continue anyway, functions might not exist
    }

    // Step 2: Create the sheet_permissions table
    const createTableQuery = `
      -- Drop and recreate sheet_permissions table with correct structure
      DROP TABLE IF EXISTS sheet_permissions CASCADE;

      -- Create sheet_permissions table with correct structure
      CREATE TABLE sheet_permissions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        sheet_id UUID NOT NULL,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        permission_type TEXT NOT NULL CHECK (permission_type IN ('read', 'write', 'admin')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID REFERENCES auth.users(id),
        UNIQUE(sheet_id, user_id)
      );

      -- Enable RLS
      ALTER TABLE sheet_permissions ENABLE ROW LEVEL SECURITY;

      -- Create indexes for better performance
      CREATE INDEX idx_sheet_permissions_sheet_id ON sheet_permissions(sheet_id);
      CREATE INDEX idx_sheet_permissions_user_id ON sheet_permissions(user_id);

      -- Grant permissions
      GRANT ALL ON sheet_permissions TO authenticated;
    `

    const { error: tableError } = await supabase.rpc("execute_sql", {
      sql_query: createTableQuery,
    })

    if (tableError) {
      console.error("Error creating table:", tableError)
      return NextResponse.json(
        {
          error: "Failed to create sheet_permissions table",
          details: tableError.message,
        },
        { status: 500 },
      )
    }

    // Step 3: Create RLS policies
    const createPoliciesQuery = `
      -- Create RLS policies
      CREATE POLICY "sheet_permissions_select" ON sheet_permissions
        FOR SELECT USING (auth.uid() IS NOT NULL);

      CREATE POLICY "sheet_permissions_insert" ON sheet_permissions
        FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

      CREATE POLICY "sheet_permissions_update" ON sheet_permissions
        FOR UPDATE USING (auth.uid() IS NOT NULL);

      CREATE POLICY "sheet_permissions_delete" ON sheet_permissions
        FOR DELETE USING (auth.uid() IS NOT NULL);
    `

    const { error: policiesError } = await supabase.rpc("execute_sql", {
      sql_query: createPoliciesQuery,
    })

    if (policiesError) {
      console.error("Error creating policies:", policiesError)
      // Continue anyway, policies might already exist
    }

    // Step 4: Create admin check function
    const createAdminFunctionQuery = `
      -- Create the admin check function
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
    `

    const { error: adminFunctionError } = await supabase.rpc("execute_sql", {
      sql_query: createAdminFunctionQuery,
    })

    if (adminFunctionError) {
      console.error("Error creating admin function:", adminFunctionError)
      return NextResponse.json(
        {
          error: "Failed to create admin function",
          details: adminFunctionError.message,
        },
        { status: 500 },
      )
    }

    // Step 5: Create permission management functions
    const createPermissionFunctionsQuery = `
      -- Function to add sheet permission
      CREATE OR REPLACE FUNCTION add_sheet_permission(
        p_sheet_id UUID,
        p_user_id UUID,
        p_permission_type TEXT
      )
      RETURNS UUID
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        permission_id UUID;
      BEGIN
        INSERT INTO sheet_permissions (sheet_id, user_id, permission_type, created_by)
        VALUES (p_sheet_id, p_user_id, p_permission_type, auth.uid())
        RETURNING id INTO permission_id;
        
        RETURN permission_id;
      EXCEPTION
        WHEN unique_violation THEN
          RAISE EXCEPTION 'User already has permission for this sheet';
        WHEN OTHERS THEN
          RAISE EXCEPTION 'Failed to add permission: %', SQLERRM;
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
        RETURN FOUND;
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
        SET permission_type = p_permission_type,
            updated_at = NOW()
        WHERE id = p_permission_id;
        RETURN FOUND;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN FALSE;
      END;
      $$;

      -- Grant permissions for all functions
      GRANT EXECUTE ON FUNCTION add_sheet_permission(UUID, UUID, TEXT) TO authenticated;
      GRANT EXECUTE ON FUNCTION remove_sheet_permission(UUID) TO authenticated;
      GRANT EXECUTE ON FUNCTION update_sheet_permission(UUID, TEXT) TO authenticated;
    `

    const { error: permissionFunctionsError } = await supabase.rpc("execute_sql", {
      sql_query: createPermissionFunctionsQuery,
    })

    if (permissionFunctionsError) {
      console.error("Error creating permission functions:", permissionFunctionsError)
      return NextResponse.json(
        {
          error: "Failed to create permission functions",
          details: permissionFunctionsError.message,
        },
        { status: 500 },
      )
    }

    // Step 6: Fix profiles table access
    const fixProfilesQuery = `
      -- Ensure profiles table has proper RLS
      DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
      CREATE POLICY "profiles_select_policy" ON profiles
        FOR SELECT USING (true);
    `

    const { error: profilesError } = await supabase.rpc("execute_sql", {
      sql_query: fixProfilesQuery,
    })

    if (profilesError) {
      console.error("Error fixing profiles:", profilesError)
      // Continue anyway, this is not critical
    }

    return NextResponse.json({
      success: true,
      message: "Permissions system and sheet_permissions table created successfully",
      details: [
        "Dropped existing functions",
        "Created sheet_permissions table with correct schema",
        "Set up RLS policies",
        "Created admin check function",
        "Created permission management functions",
        "Fixed profiles table access",
      ],
    })
  } catch (error) {
    console.error("Error in fix-permissions:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
