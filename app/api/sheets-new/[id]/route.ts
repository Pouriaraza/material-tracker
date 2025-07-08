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

    const sheetData = await sheetsDB.getSheetData(sheetId, user.id)

    if (!sheetData) {
      return NextResponse.json({ error: "Sheet not found or access denied" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: sheetData,
    })
  } catch (error) {
    console.error("Get sheet error:", error)
    return NextResponse.json({ error: "Failed to get sheet data", details: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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
    const { updates } = body

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: "Updates array is required" }, { status: 400 })
    }

    const success = await sheetsDB.bulkUpdateCells(updates)

    if (!success) {
      return NextResponse.json({ error: "Failed to update cells" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Cells updated successfully",
    })
  } catch (error) {
    console.error("Update sheet error:", error)
    return NextResponse.json({ error: "Failed to update sheet", details: error.message }, { status: 500 })
  }
}
