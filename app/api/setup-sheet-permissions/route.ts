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

    const setupQuery = `
      -- Create sheet_permissions table if it doesn't exist
      CREATE TABLE IF NOT EXISTS sheet_permissions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        sheet_id UUID NOT NULL,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        permission_type TEXT NOT NULL CHECK (permission_type IN ('read', 'write', 'admin')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID REFERENCES auth.users(id),
        UNIQUE(sheet_id, user_id)
      );

      -- Enable RLS if not already enabled
      ALTER TABLE sheet_permissions ENABLE ROW LEVEL SECURITY;

      -- Create indexes if they don't exist
      CREATE INDEX IF NOT EXISTS idx_sheet_permissions_sheet_id ON sheet_permissions(sheet_id);
      CREATE INDEX IF NOT EXISTS idx_sheet_permissions_user_id ON sheet_permissions(user_id);

      -- Grant permissions
      GRANT ALL ON sheet_permissions TO authenticated;

      -- Create policies if they don't exist
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE tablename = 'sheet_permissions' 
          AND policyname = 'sheet_permissions_select'
        ) THEN
          CREATE POLICY "sheet_permissions_select" ON sheet_permissions
            FOR SELECT USING (auth.uid() IS NOT NULL);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE tablename = 'sheet_permissions' 
          AND policyname = 'sheet_permissions_insert'
        ) THEN
          CREATE POLICY "sheet_permissions_insert" ON sheet_permissions
            FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE tablename = 'sheet_permissions' 
          AND policyname = 'sheet_permissions_update'
        ) THEN
          CREATE POLICY "sheet_permissions_update" ON sheet_permissions
            FOR UPDATE USING (auth.uid() IS NOT NULL);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE tablename = 'sheet_permissions' 
          AND policyname = 'sheet_permissions_delete'
        ) THEN
          CREATE POLICY "sheet_permissions_delete" ON sheet_permissions
            FOR DELETE USING (auth.uid() IS NOT NULL);
        END IF;
      END
      $$;
    `

    const { error: setupError } = await supabase.rpc("execute_sql", {
      sql_query: setupQuery,
    })

    if (setupError) {
      console.error("Error setting up sheet permissions:", setupError)
      return NextResponse.json(
        {
          error: "Failed to setup sheet permissions table",
          details: setupError.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Sheet permissions table setup completed successfully",
    })
  } catch (error) {
    console.error("Error in setup-sheet-permissions:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
