import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createAdminClient()

    // First, create the execute_sql function if it doesn't exist
    const { error: functionError } = await supabase.rpc("execute_sql", {
      sql_query: `
        CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
        RETURNS text
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          EXECUTE sql_query;
          RETURN 'Success';
        EXCEPTION
          WHEN OTHERS THEN
            RETURN 'Error: ' || SQLERRM;
        END;
        $$;
      `,
    })

    // If the function doesn't exist, create it first
    if (functionError && functionError.message.includes("does not exist")) {
      // Try to create the function directly
      const { error: directError } = await supabase.rpc("execute_sql", {
        sql_query: `
          CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
          RETURNS text
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
            EXECUTE sql_query;
            RETURN 'Success';
          EXCEPTION
            WHEN OTHERS THEN
              RETURN 'Error: ' || SQLERRM;
          END;
          $$;
        `,
      })

      if (directError) {
        // If we can't create the function, try direct SQL execution
        const { error: tableError } = await supabase
          .from("information_schema.tables")
          .select("table_name")
          .eq("table_name", "settlement_items")
          .single()

        if (tableError && tableError.message.includes("does not exist")) {
          // Table doesn't exist, let's create it using a different approach
          const createTableQuery = `
            CREATE TABLE IF NOT EXISTS settlement_items (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              mr_number TEXT NOT NULL UNIQUE,
              status TEXT NOT NULL DEFAULT 'none' CHECK (status IN ('none', 'problem', 'done')),
              notes TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_settlement_items_mr_number ON settlement_items(mr_number);
            CREATE INDEX IF NOT EXISTS idx_settlement_items_status ON settlement_items(status);
            CREATE INDEX IF NOT EXISTS idx_settlement_items_created_at ON settlement_items(created_at);

            ALTER TABLE settlement_items ENABLE ROW LEVEL SECURITY;

            DROP POLICY IF EXISTS "Allow authenticated users to read settlement items" ON settlement_items;
            DROP POLICY IF EXISTS "Allow authenticated users to insert settlement items" ON settlement_items;
            DROP POLICY IF EXISTS "Allow authenticated users to update settlement items" ON settlement_items;
            DROP POLICY IF EXISTS "Allow authenticated users to delete settlement items" ON settlement_items;

            CREATE POLICY "Allow authenticated users to read settlement items" ON settlement_items
              FOR SELECT USING (auth.role() = 'authenticated');

            CREATE POLICY "Allow authenticated users to insert settlement items" ON settlement_items
              FOR INSERT WITH CHECK (auth.role() = 'authenticated');

            CREATE POLICY "Allow authenticated users to update settlement items" ON settlement_items
              FOR UPDATE USING (auth.role() = 'authenticated');

            CREATE POLICY "Allow authenticated users to delete settlement items" ON settlement_items
              FOR DELETE USING (auth.role() = 'authenticated');
          `

          // Try to execute the SQL directly
          const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            },
            body: JSON.stringify({ sql_query: createTableQuery }),
          })

          if (!response.ok) {
            return NextResponse.json(
              {
                success: false,
                error: "Failed to create settlement table. Please run the SQL migration manually.",
                sql: createTableQuery,
              },
              { status: 500 },
            )
          }
        }
      }
    }

    // Now try to create the settlement_items table
    const { error } = await supabase.rpc("execute_sql", {
      sql_query: `
        -- Create settlement_items table
        CREATE TABLE IF NOT EXISTS settlement_items (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          mr_number TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL DEFAULT 'none' CHECK (status IN ('none', 'problem', 'done')),
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_settlement_items_mr_number ON settlement_items(mr_number);
        CREATE INDEX IF NOT EXISTS idx_settlement_items_status ON settlement_items(status);
        CREATE INDEX IF NOT EXISTS idx_settlement_items_created_at ON settlement_items(created_at);

        -- Enable RLS
        ALTER TABLE settlement_items ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Allow authenticated users to read settlement items" ON settlement_items;
        DROP POLICY IF EXISTS "Allow authenticated users to insert settlement items" ON settlement_items;
        DROP POLICY IF EXISTS "Allow authenticated users to update settlement items" ON settlement_items;
        DROP POLICY IF EXISTS "Allow authenticated users to delete settlement items" ON settlement_items;

        -- Create RLS policies
        CREATE POLICY "Allow authenticated users to read settlement items" ON settlement_items
          FOR SELECT USING (auth.role() = 'authenticated');

        CREATE POLICY "Allow authenticated users to insert settlement items" ON settlement_items
          FOR INSERT WITH CHECK (auth.role() = 'authenticated');

        CREATE POLICY "Allow authenticated users to update settlement items" ON settlement_items
          FOR UPDATE USING (auth.role() = 'authenticated');

        CREATE POLICY "Allow authenticated users to delete settlement items" ON settlement_items
          FOR DELETE USING (auth.role() = 'authenticated');
      `,
    })

    if (error) {
      console.error("Error setting up settlement table:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          suggestion: "Please run the SQL migration manually in Supabase SQL Editor",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Settlement table setup completed successfully",
    })
  } catch (error) {
    console.error("Error in settlement table setup:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        suggestion: "Please check your Supabase configuration and try again",
      },
      { status: 500 },
    )
  }
}
