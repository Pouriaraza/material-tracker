import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { bucketName } = await request.json()

    if (!bucketName) {
      return NextResponse.json({ error: "Bucket name is required" }, { status: 400 })
    }

    // Create a Supabase client
    const supabase = createRouteHandlerClient({ cookies })

    // Check if the user is authenticated and is an admin
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is an admin
    const { data: adminData, error: adminError } = await supabase.rpc("is_admin", {
      user_id: session.user.id,
    })

    if (adminError || !adminData) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 })
    }

    // Create the bucket
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: false,
    })

    if (error) {
      console.error("Error creating bucket:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("Error in create-bucket route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
