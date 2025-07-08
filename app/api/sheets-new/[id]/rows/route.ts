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

    if (!sheetId) {
      return NextResponse.json({ error: "Sheet ID is required" }, { status: 400 })
    }

    // اضافه کردن سطر جدید
    const newRow = await sheetsDB.addRow(sheetId, user.id)

    if (!newRow) {
      return NextResponse.json({ error: "Failed to add row" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Row added successfully",
      data: newRow,
    })
  } catch (error: any) {
    console.error("Error adding row:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to add row",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
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
    const { searchParams } = new URL(request.url)
    const rowId = searchParams.get("rowId")

    if (!sheetId || !rowId) {
      return NextResponse.json({ error: "Sheet ID and Row ID are required" }, { status: 400 })
    }

    // حذف سطر
    const result = await sheetsDB.deleteRow(rowId, user.id)

    if (!result) {
      return NextResponse.json({ error: "Failed to delete row" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Row deleted successfully",
    })
  } catch (error: any) {
    console.error("Error deleting row:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete row",
      },
      { status: 500 },
    )
  }
}
