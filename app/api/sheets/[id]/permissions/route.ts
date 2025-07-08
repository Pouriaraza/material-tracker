import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const sheetId = params.id

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get sheet permissions with user details from profiles table
    const { data: permissions, error: permissionsError } = await supabase
      .from("sheet_permissions")
      .select(`
        id,
        user_id,
        permission_level,
        granted_at,
        granted_by,
        profiles!inner(
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq("sheet_id", sheetId)
      .order("granted_at", { ascending: false })

    if (permissionsError) {
      console.error("Error fetching permissions:", permissionsError)
      return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 })
    }

    // Format the response
    const formattedPermissions =
      permissions?.map((permission) => ({
        id: permission.id,
        user_id: permission.user_id,
        permission_level: permission.permission_level,
        granted_at: permission.granted_at,
        granted_by: permission.granted_by,
        user: {
          id: permission.profiles.id,
          email: permission.profiles.email,
          full_name: permission.profiles.full_name,
          avatar_url: permission.profiles.avatar_url,
        },
      })) || []

    return NextResponse.json({
      success: true,
      permissions: formattedPermissions,
      count: formattedPermissions.length,
    })
  } catch (error) {
    console.error("Error in GET /api/sheets/[id]/permissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const sheetId = params.id
    const body = await request.json()
    const { email, permission_level } = body

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!email || !permission_level) {
      return NextResponse.json({ error: "Email and permission level are required" }, { status: 400 })
    }

    if (!["read", "write", "admin"].includes(permission_level)) {
      return NextResponse.json({ error: "Invalid permission level" }, { status: 400 })
    }

    // Find user by email in profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("email", email.toLowerCase().trim())
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error: "User not found. Make sure the user has signed up and has a profile.",
        },
        { status: 404 },
      )
    }

    // Check if permission already exists
    const { data: existingPermission } = await supabase
      .from("sheet_permissions")
      .select("id, permission_level")
      .eq("sheet_id", sheetId)
      .eq("user_id", profile.id)
      .single()

    if (existingPermission) {
      return NextResponse.json(
        {
          error: `User already has ${existingPermission.permission_level} access to this sheet`,
        },
        { status: 409 },
      )
    }

    // Add permission
    const { data: newPermission, error: insertError } = await supabase
      .from("sheet_permissions")
      .insert({
        sheet_id: sheetId,
        user_id: profile.id,
        permission_level: permission_level,
        granted_by: user.id,
      })
      .select(`
        id,
        user_id,
        permission_level,
        granted_at,
        granted_by,
        profiles!inner(
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .single()

    if (insertError) {
      console.error("Error adding permission:", insertError)
      return NextResponse.json({ error: "Failed to add user permission" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `User granted ${permission_level} access successfully`,
      permission: {
        id: newPermission.id,
        user_id: newPermission.user_id,
        permission_level: newPermission.permission_level,
        granted_at: newPermission.granted_at,
        granted_by: newPermission.granted_by,
        user: {
          id: newPermission.profiles.id,
          email: newPermission.profiles.email,
          full_name: newPermission.profiles.full_name,
          avatar_url: newPermission.profiles.avatar_url,
        },
      },
    })
  } catch (error) {
    console.error("Error in POST /api/sheets/[id]/permissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
