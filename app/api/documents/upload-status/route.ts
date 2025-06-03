import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get folder ID from query params
    const searchParams = request.nextUrl.searchParams
    const folderId = searchParams.get("folderId")

    if (!folderId) {
      return NextResponse.json({ error: "Folder ID is required" }, { status: 400 })
    }

    // Get document count for this folder
    const { count, error } = await supabase
      .from("folder_documents")
      .select("*", { count: "exact", head: true })
      .eq("folder_id", folderId)

    if (error) {
      throw error
    }

    return NextResponse.json({ count })
  } catch (error: any) {
    console.error("Error in upload-status API route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
