import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // 1. Check if the table exists
    const { data: tableExists, error: tableError } = await supabase.from("user_roles").select("*").limit(1)

    // 2. Get the table structure using PostgreSQL information_schema
    const { data: tableStructure, error: structureError } = await supabase.rpc("debug_get_table_structure", {
      table_name: "user_roles",
    })

    // 3. Try a direct SQL query to get table structure
    const { data: directSqlResult, error: directSqlError } = await supabase.rpc("debug_execute_sql", {
      sql_query: `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'user_roles' AND table_schema = 'public'
        `,
    })

    // 4. Try to insert a record with a different approach
    const { data: insertResult, error: insertError } = await supabase.rpc("debug_insert_admin", {
      user_email: "pouria.raz@mtnirancell.ir",
    })

    return NextResponse.json({
      tableExists: {
        success: !tableError,
        data: tableExists,
        error: tableError,
      },
      tableStructure: {
        success: !structureError,
        data: tableStructure,
        error: structureError,
      },
      directSqlResult: {
        success: !directSqlError,
        data: directSqlResult,
        error: directSqlError,
      },
      insertResult: {
        success: !insertError,
        data: insertResult,
        error: insertError,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: "Debug error: " + error.message }, { status: 500 })
  }
}
