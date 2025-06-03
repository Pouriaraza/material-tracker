import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  try {
    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { slug } = params

    const { data: brand, error } = await supabase.from("material_brands").select("*").eq("slug", slug).single()

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return NextResponse.json(
          {
            brand: {
              name: slug.charAt(0).toUpperCase() + slug.slice(1),
              slug: slug,
              color: "#3B82F6",
            },
          },
          { status: 200 },
        )
      }
      throw error
    }

    return NextResponse.json({ brand })
  } catch (error) {
    console.error("Error fetching brand:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch brand",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
