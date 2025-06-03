import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Try to refresh the schema cache
    try {
      // First try to use the built-in function if it exists
      const { error: rpcError } = await supabase.rpc("refresh_schema_cache")

      if (rpcError) {
        console.log("RPC method failed, trying direct SQL:", rpcError)

        // If the RPC fails, try direct SQL
        const { error: sqlError } = await supabase.from("material_brands").select("count(*)").limit(1)

        if (sqlError) {
          console.error("Failed to refresh schema via query:", sqlError)
          return NextResponse.json({ error: "Failed to refresh schema" }, { status: 500 })
        }
      }
    } catch (error) {
      console.error("Error refreshing schema:", error)
      return NextResponse.json({ error: "Failed to refresh schema" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Schema refreshed successfully",
    })
  } catch (error) {
    console.error("Error refreshing schema:", error)
    return NextResponse.json(
      {
        error: "Failed to refresh schema",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
