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

    // Get all users
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError)
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    // Get admin users separately
    const { data: adminUsers, error: adminError } = await supabase.from("admin_users").select("user_id")

    if (adminError) {
      console.warn("Error fetching admin users:", adminError)
    }

    // Create a set of admin user IDs for quick lookup
    const adminUserIds = new Set(adminUsers?.map((admin) => admin.user_id) || [])

    // Format users data
    const formattedUsers =
      profiles?.map((profile) => ({
        ...profile,
        is_admin: adminUserIds.has(profile.id),
      })) || []

    return NextResponse.json({ users: formattedUsers })
  } catch (error) {
    console.error("Error in users API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
