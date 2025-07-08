import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { userId, isActive } = await request.json()

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check admin status
    const { data: adminCheck } = await supabase.from("admin_users").select("id").eq("user_id", user.id).single()

    if (!adminCheck) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Prevent deactivating self
    if (userId === user.id && !isActive) {
      return NextResponse.json({ error: "Cannot deactivate yourself" }, { status: 400 })
    }

    // Update user active status
    const { error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", userId)

    if (error) {
      console.error("Error updating user status:", error)
      return NextResponse.json({ error: "Failed to update user status" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in toggle-active API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
