import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete all materials that are likely sample data
    // This includes materials with specific sample names or created during setup
    const { error: deleteError } = await supabase
      .from("materials")
      .delete()
      .or(
        "name.ilike.%AIR%,name.ilike.%AAU%,name.ilike.%RRU%,name.ilike.%5G Core%,part_number.ilike.%KRD%,part_number.ilike.%ROJ%,part_number.ilike.%02311%",
      )

    if (deleteError) {
      console.error("Error deleting sample materials:", deleteError)
      return NextResponse.json(
        {
          error: "Failed to clear sample materials",
          details: deleteError.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Sample materials cleared successfully",
    })
  } catch (error) {
    console.error("Error in clear-samples API:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
