import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // SQL to add brand column if it doesn't exist
    const sql = `
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_name = 'materials'
              AND column_name = 'brand'
          ) THEN
              ALTER TABLE materials ADD COLUMN brand TEXT DEFAULT 'ericsson';
          END IF;
      END $$;
    `

    // Execute the SQL
    const { error } = await supabase.rpc("refresh_schema_cache")
    if (error) {
      console.error("Error refreshing schema cache:", error)
    }

    const { error: sqlError } = await supabase.from("_exec").select("*").eq("query", sql).single()

    if (sqlError) {
      // Try alternative approach
      const { error: rawError } = await supabase.rpc("run_sql", { sql })

      if (rawError) {
        return NextResponse.json(
          {
            error: "Failed to add brand column",
            details: rawError.message,
          },
          { status: 500 },
        )
      }
    }

    // Refresh schema cache again
    await supabase.rpc("refresh_schema_cache")

    return NextResponse.json({
      success: true,
      message: "Brand column added to materials table",
    })
  } catch (error) {
    console.error("Error adding brand column:", error)
    return NextResponse.json(
      {
        error: "Failed to add brand column",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
