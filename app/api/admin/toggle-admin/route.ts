import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { userId, makeAdmin } = await request.json()

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

    // Prevent removing admin status from self
    if (userId === user.id && !makeAdmin) {
      return NextResponse.json({ error: "Cannot remove admin status from yourself" }, { status: 400 })
    }

    if (makeAdmin) {
      // Add admin status
      const { error } = await supabase.from("admin_users").insert({
        user_id: userId,
        created_by: user.id,
      })

      if (error) {
        console.error("Error adding admin:", error)
        return NextResponse.json({ error: "Failed to add admin status" }, { status: 500 })
      }
    } else {
      // Remove admin status
      const { error } = await supabase.from("admin_users").delete().eq("user_id", userId)

      if (error) {
        console.error("Error removing admin:", error)
        return NextResponse.json({ error: "Failed to remove admin status" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in toggle-admin API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
