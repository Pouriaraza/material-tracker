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
    const categoryId = searchParams.get("category_id")
    const brand = searchParams.get("brand")

    // Check if table exists first
    const { data: tableExists, error: tableCheckError } = await supabase.from("materials").select("id").limit(1)

    if (tableCheckError) {
      console.error("Table check error:", tableCheckError)
      // Table doesn't exist
      if (tableCheckError.message.includes("does not exist") || tableCheckError.code === "42P01") {
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
          error: "Database error",
          details: tableCheckError.message,
          tableExists: false,
        },
        { status: 500 },
      )
    }

    // Check if brand column exists
    try {
      // Try to select the brand column to see if it exists
      const { error: brandColumnError } = await supabase.from("materials").select("brand").limit(1)

      if (brandColumnError) {
        if (brandColumnError.message.includes("column materials.brand does not exist")) {
          return NextResponse.json(
            {
              error: "column materials.brand does not exist",
              brandColumnMissing: true,
              tableExists: true,
              materials: [],
            },
            { status: 200 }, // Return 200 so we can handle this gracefully in the UI
          )
        }
      }
    } catch (error) {
      console.error("Error checking brand column:", error)
    }

    let query = supabase.from("materials").select(`
        *,
        material_categories (
          name,
          color
        )
      `)

    if (categoryId) {
      query = query.eq("category_id", categoryId)
    }

    // Only filter by brand if we know the column exists
    if (brand) {
      try {
        query = query.eq("brand", brand)
      } catch (error) {
        console.error("Error filtering by brand:", error)
        // Continue without brand filter
      }
    }

    query = query.order("created_at", { ascending: false }) // Show newest first

    const { data: materials, error } = await query

    if (error) {
      console.error("Materials fetch error:", error)

      // Check if it's a brand column error
      if (error.message.includes("column materials.brand does not exist")) {
        return NextResponse.json(
          {
            error: "column materials.brand does not exist",
            brandColumnMissing: true,
            tableExists: true,
            materials: [],
          },
          { status: 200 }, // Return 200 so we can handle this gracefully in the UI
        )
      }

      return NextResponse.json(
        {
          error: "Failed to fetch materials",
          details: error.message,
          tableExists: true,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      materials: materials || [],
      tableExists: true,
    })
  } catch (error) {
    console.error("Unexpected error in materials API:", error)

    // Check if it's a table not found error
    if (error instanceof Error) {
      if (error.message.includes("does not exist") || error.message.includes("relation")) {
        return NextResponse.json(
          {
            error: "Database tables need to be created",
            tableExists: false,
            details: error.message,
          },
          { status: 500 },
        )
      }

      // Check if it's a brand column error
      if (error.message.includes("column materials.brand does not exist")) {
        return NextResponse.json(
          {
            error: "column materials.brand does not exist",
            brandColumnMissing: true,
            tableExists: true,
            materials: [],
          },
          { status: 200 }, // Return 200 so we can handle this gracefully in the UI
        )
      }
    }

    return NextResponse.json(
      {
        error: "Failed to fetch materials",
        details: error instanceof Error ? error.message : "Unknown error",
        tableExists: false,
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
    const { name, description, notes, part_number, category_id, brand, quantity, unit, location, status } = body

    if (!name || !category_id) {
      return NextResponse.json({ error: "Name and category_id are required" }, { status: 400 })
    }

    console.log("Creating material with brand:", brand)

    // Check if brand column exists
    try {
      // Try to select the brand column to see if it exists
      const { error: brandColumnError } = await supabase.from("materials").select("brand").limit(1)

      if (brandColumnError && brandColumnError.message.includes("column materials.brand does not exist")) {
        // Brand column doesn't exist, create it
        const addColumnSql = `ALTER TABLE materials ADD COLUMN IF NOT EXISTS brand TEXT DEFAULT 'ericsson';`
        await supabase.rpc("refresh_schema_cache")

        try {
          // Try to execute the SQL
          const { error: sqlError } = await supabase.from("_exec").select("*").eq("query", addColumnSql).single()

          if (sqlError) {
            // Try alternative approach
            const { error: rawError } = await supabase.rpc("run_sql", { sql: addColumnSql })

            if (rawError) {
              console.error("Error adding brand column:", rawError)
              // Continue without brand
            }
          }

          // Refresh schema cache
          await supabase.rpc("refresh_schema_cache")
        } catch (error) {
          console.error("Error executing SQL to add brand column:", error)
          // Continue without brand
        }
      }
    } catch (error) {
      console.error("Error checking brand column:", error)
      // Continue without checking brand column
    }

    // Try to insert with brand column first
    const insertData: any = {
      name,
      description,
      notes,
      part_number,
      category_id,
      quantity: quantity || 0,
      unit: unit || "pcs",
      location,
      status: status || "available",
      created_by: session.user.id,
    }

    // Add brand if provided
    if (brand) {
      insertData.brand = brand
    }

    try {
      // First refresh the schema to ensure the brand column is recognized
      await supabase.rpc("refresh_schema_cache")

      const { data: material, error } = await supabase.from("materials").insert(insertData).select().single()

      if (error) {
        console.error("Material creation error:", error)

        // If there's a brand column error, try without brand
        if (error.message.includes("column materials.brand does not exist")) {
          const { brand: _, ...dataWithoutBrand } = insertData
          const { data: materialWithoutBrand, error: errorWithoutBrand } = await supabase
            .from("materials")
            .insert(dataWithoutBrand)
            .select()
            .single()

          if (errorWithoutBrand) {
            throw errorWithoutBrand
          }

          return NextResponse.json({
            success: true,
            material: materialWithoutBrand,
            message: "Material created without brand specification",
          })
        }

        // If there's still an issue, try a direct SQL insert
        const { data: directInsert, error: directError } = await supabase.rpc("insert_material", {
          p_name: name,
          p_description: description || "",
          p_notes: notes || "",
          p_part_number: part_number || "",
          p_category_id: category_id,
          p_brand: brand || "ericsson",
          p_quantity: quantity || 0,
          p_unit: unit || "pcs",
          p_location: location || "",
          p_status: status || "available",
          p_created_by: session.user.id,
        })

        if (directError) {
          throw directError
        }

        return NextResponse.json({
          success: true,
          material: directInsert,
          message: "Material created using direct SQL",
        })
      }

      return NextResponse.json({
        success: true,
        material,
      })
    } catch (error) {
      console.error("Material creation error:", error)
      return NextResponse.json(
        {
          error: "Failed to create material",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Unexpected error creating material:", error)
    return NextResponse.json(
      {
        error: "Failed to create material",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
