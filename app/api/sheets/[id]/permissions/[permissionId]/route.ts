import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(request: NextRequest, { params }: { params: { id: string; permissionId: string } }) {
  try {
    const supabase = createClient()
    const { id: sheetId, permissionId } = params
    const body = await request.json()
    const { permission_level } = body

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!permission_level || !["read", "write", "admin"].includes(permission_level)) {
      return NextResponse.json({ error: "Invalid permission level" }, { status: 400 })
    }

    // Update permission
    const { data: updatedPermission, error: updateError } = await supabase
      .from("sheet_permissions")
      .update({
        permission_level: permission_level,
      })
      .eq("id", permissionId)
      .eq("sheet_id", sheetId)
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

    if (updateError) {
      console.error("Error updating permission:", updateError)
      return NextResponse.json({ error: "Failed to update permission" }, { status: 500 })
    }

    if (!updatedPermission) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `Permission updated to ${permission_level}`,
      permission: {
        id: updatedPermission.id,
        user_id: updatedPermission.user_id,
        permission_level: updatedPermission.permission_level,
        granted_at: updatedPermission.granted_at,
        granted_by: updatedPermission.granted_by,
        user: {
          id: updatedPermission.profiles.id,
          email: updatedPermission.profiles.email,
          full_name: updatedPermission.profiles.full_name,
          avatar_url: updatedPermission.profiles.avatar_url,
        },
      },
    })
  } catch (error) {
    console.error("Error in PATCH /api/sheets/[id]/permissions/[permissionId]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; permissionId: string } }) {
  try {
    const supabase = createClient()
    const { id: sheetId, permissionId } = params

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get permission details before deleting
    const { data: permission, error: getError } = await supabase
      .from("sheet_permissions")
      .select(`
        id,
        profiles!inner(
          email
        )
      `)
      .eq("id", permissionId)
      .eq("sheet_id", sheetId)
      .single()

    if (getError || !permission) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 })
    }

    // Delete permission
    const { error: deleteError } = await supabase
      .from("sheet_permissions")
      .delete()
      .eq("id", permissionId)
      .eq("sheet_id", sheetId)

    if (deleteError) {
      console.error("Error deleting permission:", deleteError)
      return NextResponse.json({ error: "Failed to delete permission" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Removed ${permission.profiles.email} from sheet`,
    })
  } catch (error) {
    console.error("Error in DELETE /api/sheets/[id]/permissions/[permissionId]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
