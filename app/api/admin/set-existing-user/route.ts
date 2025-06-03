import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const { userId } = await request.json()

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Check if user is already an admin
    const { data: existingRole, error: roleError } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle()

    if (existingRole) {
      return NextResponse.json({ message: "User is already an admin" }, { status: 200 })
    }

    // Add admin role
    const { error: insertError } = await supabase.from("user_roles").insert([{ user_id: userId, role: "admin" }])

    if (insertError) {
      return NextResponse.json({ error: "Failed to set admin role: " + insertError.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Admin role assigned successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error setting up admin:", error)
    return NextResponse.json({ error: "Internal server error: " + error.message }, { status: 500 })
  }
}
