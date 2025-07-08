import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { id } = params

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

    // Delete invitation
    const { error } = await supabase.from("user_invitations").delete().eq("id", id)

    if (error) {
      console.error("Error deleting invitation:", error)
      return NextResponse.json({ error: "Failed to delete invitation" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in delete invitation API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
