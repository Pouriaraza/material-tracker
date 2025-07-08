import { type NextRequest, NextResponse } from "next/server"
import { sheetsDB } from "@/lib/db-sheets-new"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { name, description, settings = {} } = body

    if (!name) {
      return NextResponse.json({ error: "Sheet name is required" }, { status: 400 })
    }

    const sheet = await sheetsDB.createSheet(name, description || "", user.id, settings)

    if (!sheet) {
      return NextResponse.json({ error: "Failed to create sheet" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      sheet,
    })
  } catch (error) {
    console.error("Create sheet error:", error)
    return NextResponse.json({ error: "Failed to create sheet", details: error.message }, { status: 500 })
  }
}
