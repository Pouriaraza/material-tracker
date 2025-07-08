import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const sheetId = params.id

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

    // Get all access records for this sheet
    const { data: accessList, error: accessError } = await supabase
      .from("sheet_access")
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
        ),
        granted_by_profile:granted_by (
          email,
          full_name
        )
      `)
      .eq("sheet_id", sheetId)
      .eq("is_active", true)
      .order("granted_at", { ascending: false })

    if (accessError) {
      console.error("Error fetching access list:", accessError)
      return NextResponse.json({ error: "Failed to fetch access list" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      access: accessList || [],
      isOwner,
    })
  } catch (error) {
    console.error("Access list error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const sheetId = params.id

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
    const { userEmail, accessLevel, expiresAt, notes } = body

    if (!userEmail || !accessLevel) {
      return NextResponse.json({ error: "User email and access level are required" }, { status: 400 })
    }

    if (!["viewer", "editor", "admin"].includes(accessLevel)) {
      return NextResponse.json({ error: "Invalid access level" }, { status: 400 })
    }

    // Find the target user
    const { data: targetUser, error: userLookupError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", userEmail.toLowerCase().trim())
      .single()

    if (userLookupError || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Don't allow granting access to the sheet owner
    if (targetUser.id === sheet.owner_id) {
      return NextResponse.json({ error: "Cannot grant access to sheet owner" }, { status: 400 })
    }

    // Insert or update access
    const { data: accessRecord, error: accessError } = await supabase
      .from("sheet_access")
      .upsert(
        {
          sheet_id: sheetId,
          user_id: targetUser.id,
          access_level: accessLevel,
          granted_by: user.id,
          expires_at: expiresAt || null,
          notes: notes || null,
          is_active: true,
        },
        {
          onConflict: "sheet_id,user_id",
        },
      )
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

    if (accessError) {
      console.error("Error granting access:", accessError)
      return NextResponse.json({ error: "Failed to grant access" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      access: accessRecord,
    })
  } catch (error) {
    console.error("Grant access error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
</merged_code>
