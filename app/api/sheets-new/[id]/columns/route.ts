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
    const { name, type, validation_rules = {}, format_options = {} } = body

    if (!name || !type) {
      return NextResponse.json({ error: "Column name and type are required" }, { status: 400 })
    }

    const column = await sheetsDB.addColumn(
      sheetId,
      {
        name,
        type,
        validation_rules,
        format_options,
      },
      user.id,
    )

    if (!column) {
      return NextResponse.json({ error: "Failed to add column" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      column,
    })
  } catch (error) {
    console.error("Add column error:", error)
    return NextResponse.json({ error: "Failed to add column", details: error.message }, { status: 500 })
  }
}
