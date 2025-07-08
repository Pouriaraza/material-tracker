import { type NextRequest, NextResponse } from "next/server"
import { sheetsDB } from "@/lib/db-sheets-new"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const sheetId = params.id
    const body = await request.json()
    const { search_term = "", column_filters = {} } = body

    const results = await sheetsDB.searchSheetData(sheetId, search_term, column_filters)

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
    })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Failed to search", details: error.message }, { status: 500 })
  }
}
