import { NextResponse } from "next/server"
import { sheetsDB } from "@/lib/db-sheets-new"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()

    // بررسی احراز هویت
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sheetId = params.id
    const body = await request.json()
    const { search_term, column_filters } = body

    if (!sheetId) {
      return NextResponse.json({ error: "Sheet ID is required" }, { status: 400 })
    }

    // جستجو در داده‌ها
    const searchResults = await sheetsDB.searchSheetData(sheetId, search_term || "", column_filters || {})

    return NextResponse.json({
      success: true,
      data: {
        results: searchResults,
        count: searchResults.length,
      },
    })
  } catch (error: any) {
    console.error("Error searching sheet:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to search sheet",
      },
      { status: 500 },
    )
  }
}
