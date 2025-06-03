import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = createClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // List all buckets
    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
      console.error("Error listing buckets:", error)
      return NextResponse.json({ error: error.message, available: false }, { status: 500 })
    }

    // Return bucket information
    return NextResponse.json({
      available: buckets && buckets.length > 0,
      buckets: buckets || [],
    })
  } catch (error: any) {
    console.error("Error in check-storage API:", error)
    return NextResponse.json({ error: error.message || "An unknown error occurred", available: false }, { status: 500 })
  }
}
