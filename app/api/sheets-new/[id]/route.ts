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

    // دریافت داده‌های شیت
    const sheetData = await sheetsDB.getSheetData(sheetId, user.id)

    if (!sheetData) {
      return NextResponse.json({ error: "Sheet not found or access denied" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: sheetData,
    })
  } catch (error: any) {
    console.error("Error fetching sheet data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch sheet data",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
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
    const { updates } = body

    if (!sheetId) {
      return NextResponse.json({ error: "Sheet ID is required" }, { status: 400 })
    }

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: "Updates array is required" }, { status: 400 })
    }

    // به‌روزرسانی دسته‌ای سلول‌ها
    const result = await sheetsDB.bulkUpdateCells(updates)

    if (!result) {
      return NextResponse.json({ error: "Failed to update cells" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updates.length} cells`,
    })
  } catch (error: any) {
    console.error("Error updating sheet:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update sheet",
      },
      { status: 500 },
    )
  }
}
