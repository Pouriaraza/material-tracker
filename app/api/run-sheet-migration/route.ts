import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { readFileSync } from "fs"
import { join } from "path"

export async function POST() {
  try {
    const supabase = createClient()

    // Check if user is authenticated and is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: isAdminResult, error: adminError } = await supabase.rpc("is_admin", {
      user_id: user.id,
    })

    if (adminError || !isAdminResult) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Read the migration file
    const migrationPath = join(process.cwd(), "migrations", "fix_rows_position_constraint.sql")
    const migrationSQL = readFileSync(migrationPath, "utf8")

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"))

    const results = []

    // Execute each statement
    for (const statement of statements) {
      try {
        const { data, error } = await supabase.rpc("execute_sql", {
          sql_query: statement,
        })

        if (error) {
          console.error(`Error executing statement: ${statement}`, error)
          results.push({
            statement: statement.substring(0, 100) + "...",
            success: false,
            error: error.message,
          })
        } else {
          results.push({
            statement: statement.substring(0, 100) + "...",
            success: true,
            result: data,
          })
        }
      } catch (err: any) {
        console.error(`Exception executing statement: ${statement}`, err)
        results.push({
          statement: statement.substring(0, 100) + "...",
          success: false,
          error: err.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Migration executed",
      results,
    })
  } catch (error: any) {
    console.error("Error running sheet migration:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to run migration",
      },
      { status: 500 },
    )
  }
}
