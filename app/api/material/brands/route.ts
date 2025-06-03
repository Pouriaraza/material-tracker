import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if table exists by trying to query it
    const { data: brands, error } = await supabase
      .from("material_brands")
      .select("*")
      .order("created_at", { ascending: false }) // Show newest brands first

    if (error) {
      // If table doesn't exist, return indication
      if (error.code === "42P01") {
        return NextResponse.json({
          tableExists: false,
          brands: [],
          error: "Table does not exist",
        })
      }
      throw error
    }

    return NextResponse.json({
      tableExists: true,
      brands: brands || [],
    })
  } catch (error) {
    console.error("Error fetching brands:", error)
    return NextResponse.json(
      {
        tableExists: false,
        error: "Failed to fetch brands",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, color } = body

    if (!name) {
      return NextResponse.json({ error: "Brand name is required" }, { status: 400 })
    }

    // Create slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

    // Check if brand with this slug already exists
    const { data: existingBrand } = await supabase.from("material_brands").select("id").eq("slug", slug).single()

    if (existingBrand) {
      return NextResponse.json({ error: "Brand with this name already exists" }, { status: 400 })
    }

    const { data: brand, error } = await supabase
      .from("material_brands")
      .insert({
        name,
        slug,
        description: description || `${name} equipment and materials`,
        color: color || "#3B82F6",
        created_by: session.user.id,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating brand:", error)
      return NextResponse.json({ error: "Failed to create brand" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      brand,
      message: "Brand created successfully",
    })
  } catch (error) {
    console.error("Error creating brand:", error)
    return NextResponse.json(
      {
        error: "Failed to create brand",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
