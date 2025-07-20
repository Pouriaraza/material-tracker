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
    const { name, type, validation_rules, format_options, default_value } = body

    if (!sheetId) {
      return NextResponse.json({ error: "Sheet ID is required" }, { status: 400 })
    }

    if (!name || !type) {
      return NextResponse.json({ error: "Column name and type are required" }, { status: 400 })
    }

    // اضافه کردن ستون جدید
    const newColumn = await sheetsDB.addColumn(
      sheetId,
      {
        name,
        type,
        validation_rules: validation_rules || {},
        format_options: format_options || {},
        default_value,
      },
      user.id,
    )

    if (!newColumn) {
      return NextResponse.json({ error: "Failed to add column" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Column added successfully",
      data: newColumn,
    })
  } catch (error: any) {
    console.error("Error adding column:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to add column",
      },
      { status: 500 },
    )
  }
}
