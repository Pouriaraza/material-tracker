import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(request: NextRequest, { params }: { params: { id: string; accessId: string } }) {
  try {
    const supabase = createClient()
    const sheetId = params.id
    const accessId = params.accessId

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Check if user is the sheet owner or has admin access
    const { data: sheet, error: sheetError } = await supabase
      .from("sheets")
      .select("owner_id")
      .eq("id", sheetId)
      .single()

    if (sheetError) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 })
    }

    const isOwner = sheet.owner_id === user.id

    if (!isOwner) {
      // Check if user has admin access to this sheet
      const { data: userAccess, error: accessError } = await supabase
        .from("sheet_access")
        .select("access_level")
        .eq("sheet_id", sheetId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single()

      if (accessError || !userAccess || userAccess.access_level !== "admin") {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
      }
    }

    const body = await request.json()
    const { accessLevel, expiresAt, notes } = body

    if (accessLevel && !["viewer", "editor", "admin"].includes(accessLevel)) {
      return NextResponse.json({ error: "Invalid access level" }, { status: 400 })
    }

    // Update the access record
    const updateData: any = {}
    if (accessLevel) updateData.access_level = accessLevel
    if (expiresAt !== undefined) updateData.expires_at = expiresAt
    if (notes !== undefined) updateData.notes = notes

    const { data: accessRecord, error: updateError } = await supabase
      .from("sheet_access")
      .update(updateData)
      .eq("id", accessId)
      .eq("sheet_id", sheetId)
      .select(`
        id,
        user_id,
        access_level,
        granted_by,
        granted_at,
        expires_at,
        is_active,
        notes,
        profiles:user_id (
          email,
          full_name
        )
      `)
      .single()

    if (updateError) {
      console.error("Error updating access:", updateError)
      return NextResponse.json({ error: "Failed to update access" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      access: accessRecord,
    })
  } catch (error) {
    console.error("Update access error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; accessId: string } }) {
  try {
    const supabase = createClient()
    const sheetId = params.id
    const accessId = params.accessId

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Check if user is the sheet owner or has admin access
    const { data: sheet, error: sheetError } = await supabase
      .from("sheets")
      .select("owner_id")
      .eq("id", sheetId)
      .single()

    if (sheetError) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 })
    }

    const isOwner = sheet.owner_id === user.id

    if (!isOwner) {
      // Check if user has admin access to this sheet
      const { data: userAccess, error: accessError } = await supabase
        .from("sheet_access")
        .select("access_level")
        .eq("sheet_id", sheetId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single()

      if (accessError || !userAccess || userAccess.access_level !== "admin") {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
      }
    }

    // Soft delete the access record
    const { error: deleteError } = await supabase
      .from("sheet_access")
      .update({ is_active: false })
      .eq("id", accessId)
      .eq("sheet_id", sheetId)

    if (deleteError) {
      console.error("Error revoking access:", deleteError)
      return NextResponse.json({ error: "Failed to revoke access" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("Revoke access error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
