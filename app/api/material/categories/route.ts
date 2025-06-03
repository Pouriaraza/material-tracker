import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brand = searchParams.get("brand")

    if (!brand) {
      return NextResponse.json({ error: "Brand parameter is required" }, { status: 400 })
    }

    // Check if table exists first
    const { data: tableExists, error: tableCheckError } = await supabase
      .from("material_categories")
      .select("id")
      .limit(1)

    if (tableCheckError) {
      // Table doesn't exist
      if (tableCheckError.message.includes("does not exist")) {
        return NextResponse.json(
          {
            error: "Database tables need to be created",
            tableExists: false,
          },
          { status: 500 },
        )
      }
      throw tableCheckError
    }

    const { data: categories, error } = await supabase
      .from("material_categories")
      .select("*")
      .eq("brand", brand)
      .order("created_at", { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({
      categories: categories || [],
      tableExists: true,
    })
  } catch (error) {
    console.error("Error fetching categories:", error)

    // Check if it's a table not found error
    if (error instanceof Error && error.message.includes("does not exist")) {
      return NextResponse.json(
        {
          error: "Database tables need to be created",
          tableExists: false,
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to fetch categories",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, brand, color } = body

    if (!name || !brand) {
      return NextResponse.json({ error: "Name and brand are required" }, { status: 400 })
    }

    const { data: category, error } = await supabase
      .from("material_categories")
      .insert({
        name,
        description,
        brand,
        color: color || (brand === "ericsson" ? "#3B82F6" : "#DC2626"),
        created_by: session.user.id,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error("Error creating category:", error)
    return NextResponse.json(
      {
        error: "Failed to create category",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
