import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Check if tables exist
    const { data: categories, error: categoriesError } = await supabase
      .from("material_categories")
      .select("count")
      .limit(1)

    const { data: materials, error: materialsError } = await supabase.from("materials").select("count").limit(1)

    return NextResponse.json({
      tables: {
        material_categories: {
          exists: !categoriesError,
          error: categoriesError?.message,
        },
        materials: {
          exists: !materialsError,
          error: materialsError?.message,
        },
      },
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
