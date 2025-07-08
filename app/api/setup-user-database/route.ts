import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Read and execute the SQL migration
    const sqlPath = join(process.cwd(), "migrations", "create_complete_user_system.sql")
    const sqlContent = readFileSync(sqlPath, "utf8")

    // Split SQL into individual statements and execute them
    const statements = sqlContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0)

    const results = []
    for (const statement of statements) {
      try {
        const { data, error } = await supabase.rpc("execute_sql", {
          sql_query: statement,
        })

        if (error) {
          console.error("SQL Error:", error)
          results.push({ statement: statement.substring(0, 100) + "...", error: error.message })
        } else {
          results.push({ statement: statement.substring(0, 100) + "...", success: true })
        }
      } catch (err: any) {
        console.error("Execution error:", err)
        results.push({ statement: statement.substring(0, 100) + "...", error: err.message })
      }
    }

    return NextResponse.json({
      success: true,
      message: "User database setup completed",
      results,
    })
  } catch (error: any) {
    console.error("Setup error:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to setup user database",
      },
      { status: 500 },
    )
  }
}
