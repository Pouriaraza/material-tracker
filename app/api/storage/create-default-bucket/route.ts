import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = createClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin", {
      user_id: session.user.id,
    })

    if (adminError || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 })
    }

    // Create the default bucket
    const { data, error } = await supabase.storage.createBucket("site-files", {
      public: false,
      fileSizeLimit: 52428800, // 50MB in bytes
    })

    if (error) {
      console.error("Error creating bucket:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If successful, return the bucket data
    return NextResponse.json({ success: true, bucket: data })
  } catch (error: any) {
    console.error("Error in create-default-bucket API:", error)
    return NextResponse.json({ error: error.message || "An unknown error occurred" }, { status: 500 })
  }
}
