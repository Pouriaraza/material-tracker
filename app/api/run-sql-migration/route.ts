import { type NextRequest, NextResponse } from "next/server"
import { checkIsAdmin } from "@/lib/auth-utils"

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const isAdmin = await checkIsAdmin()

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const table = request.nextUrl.searchParams.get("table")

    if (!table) {
      return NextResponse.json({ error: "Table parameter is required" }, { status: 400 })
    }

    // Create the SQL based on the table parameter
    let sql = ""
    if (table === "settlement_items") {
      sql = `
        CREATE TABLE IF NOT EXISTS settlement_items (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          mr_number TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL DEFAULT 'none',
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
      `
    } else {
      return NextResponse.json({ error: "Invalid table parameter" }, { status: 400 })
    }

    // Redirect to the inline SQL execution page
    return NextResponse.redirect(new URL("/settlement-tracker", request.url))
  } catch (error: any) {
    console.error("Error in run-sql-migration API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
