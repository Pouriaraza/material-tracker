import { type NextRequest, NextResponse } from "next/server"
import { sheetsDB } from "@/lib/db-sheets-new"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    const stats = await sheetsDB.getSheetStats(sheetId)

    if (!stats) {
      return NextResponse.json({ error: "Stats not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error("Get stats error:", error)
    return NextResponse.json({ error: "Failed to get stats", details: error.message }, { status: 500 })
  }
}
