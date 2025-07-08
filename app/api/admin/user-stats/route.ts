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

    // Get user statistics
    const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true })

    const { count: activeUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)

    const { count: adminUsers } = await supabase.from("admin_users").select("*", { count: "exact", head: true })

    // Get recent signups (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const { count: recentSignups } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString())

    const { count: pendingInvitations } = await supabase
      .from("user_invitations")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")

    const stats = {
      total_users: totalUsers || 0,
      active_users: activeUsers || 0,
      admin_users: adminUsers || 0,
      recent_signups: recentSignups || 0,
      pending_invitations: pendingInvitations || 0,
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error("Error in user-stats API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
