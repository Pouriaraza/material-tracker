import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Check if the user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // First, check if the table already exists by trying to query it
    const { error: checkError } = await supabase.from("public_links").select("id").limit(1)

    // If there's no error, the table exists
    if (!checkError) {
      return NextResponse.json({ success: true, message: "Table already exists" })
    }

    // If the table doesn't exist, we'll try to create it using direct SQL
    // Since we can't execute arbitrary SQL directly through the Supabase client,
    // we'll need to use a different approach

    // Create a simple record in the sheets table to test if we have permissions
    const { error: permissionCheckError } = await supabase.from("sheets").select("id").limit(1)

    if (permissionCheckError) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient permissions to create tables",
          message: "Please run the migration script manually to create the public_links table.",
        },
        { status: 403 },
      )
    }

    // Return a message indicating that the table needs to be created manually
    return NextResponse.json(
      {
        success: false,
        error: "Table does not exist",
        message: "The public_links table needs to be created manually. Please run the migration script.",
      },
      { status: 404 },
    )
  } catch (err) {
    console.error("Error in create-public-links-table route:", err)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: "An unexpected error occurred while checking for the public_links table.",
      },
      { status: 500 },
    )
  }
}
