import { NextResponse } from "next/server"
import { sheetsDB } from "@/lib/db-sheets-new"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
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

    if (!sheetId) {
      return NextResponse.json({ error: "Sheet ID is required" }, { status: 400 })
    }

    // دریافت آمار شیت
    const stats = await sheetsDB.getSheetStats(sheetId)

    if (!stats) {
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error: any) {
    console.error("Error fetching sheet stats:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch sheet stats",
      },
      { status: 500 },
    )
  }
}
