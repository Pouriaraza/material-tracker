import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = createClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the table name from the request
    const { tableName } = await request.json()

    if (!tableName || (tableName !== "reserve_permissions" && tableName !== "settlement_permissions")) {
      return NextResponse.json({ error: "Invalid table name" }, { status: 400 })
    }

    // Check if the table exists
    const { error: checkError } = await supabase.from(tableName).select("id").limit(1)

    if (checkError && checkError.code === "42P01") {
      // Table doesn't exist, create it using direct SQL
      // We'll use the migration file approach instead
      return NextResponse.json(
        {
          success: false,
          error: "Table does not exist",
          message: "Please run the migration file to create the permissions tables",
        },
        { status: 404 },
      )
    } else if (checkError) {
      // Some other error occurred
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `Table ${tableName} exists` })
  } catch (error: any) {
    console.error("Error in setup-permissions-tables API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
