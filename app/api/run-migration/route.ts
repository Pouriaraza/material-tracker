import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = createClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: user } = await supabase.auth.getUser()
    if (!user?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.user.id)
      .maybeSingle()

    if (!adminUser) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Get the migration name from the request
    const { migration } = await request.json()

    if (!migration) {
      return NextResponse.json({ error: "Migration name is required" }, { status: 400 })
    }

    // Return success since tables are already created
    return NextResponse.json({ success: true, message: "Tables already exist" })
  } catch (error: any) {
    console.error("Error in run-migration API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
