import { NextResponse } from "next/server"
import { sheetsDB } from "@/lib/db-sheets-new"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
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

    const body = await request.json()
    const { name, description, settings } = body

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Sheet name is required" }, { status: 400 })
    }

    // ایجاد شیت جدید
    const newSheet = await sheetsDB.createSheet(name.trim(), description || "", user.id, settings || {})

    if (!newSheet) {
      return NextResponse.json({ error: "Failed to create sheet" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Sheet created successfully",
      data: {
        sheet_id: newSheet.id,
        name: newSheet.name,
        description: newSheet.description,
        created_at: newSheet.created_at,
      },
    })
  } catch (error: any) {
    console.error("Error creating sheet:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create sheet",
      },
      { status: 500 },
    )
  }
}
