import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

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

    // Get all invitations
    const { data: invitations, error } = await supabase
      .from("user_invitations")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching invitations:", error)
      return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 })
    }

    return NextResponse.json({ invitations: invitations || [] })
  } catch (error) {
    console.error("Error in invitations API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
