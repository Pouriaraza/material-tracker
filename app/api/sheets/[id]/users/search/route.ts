import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const sheetId = params.id
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""

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

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] })
    }

    // Search for users by email
    const { data: users, error: searchError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .ilike("email", `%${query}%`)
      .neq("id", sheet.owner_id) // Exclude sheet owner
      .limit(10)

    if (searchError) {
      console.error("Error searching users:", searchError)
      return NextResponse.json({ error: "Failed to search users" }, { status: 500 })
    }

    // Filter out users who already have access
    const { data: existingAccess, error: accessError } = await supabase
      .from("sheet_access")
      .select("user_id")
      .eq("sheet_id", sheetId)
      .eq("is_active", true)

    if (accessError) {
      console.error("Error checking existing access:", accessError)
      return NextResponse.json({ error: "Failed to check existing access" }, { status: 500 })
    }

    const existingUserIds = existingAccess?.map((access) => access.user_id) || []
    const availableUsers = users?.filter((user) => !existingUserIds.includes(user.id)) || []

    return NextResponse.json({
      users: availableUsers,
    })
  } catch (error) {
    console.error("User search error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
