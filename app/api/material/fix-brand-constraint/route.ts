import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Try to remove the brand constraint
    const { error } = await supabase.rpc("execute_sql", {
      sql: "ALTER TABLE material_categories DROP CONSTRAINT IF EXISTS material_categories_brand_check;",
    })

    if (error) {
      console.error("Error removing constraint:", error)
      return NextResponse.json({ error: "Failed to remove brand constraint", details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Brand constraint removed successfully" })
  } catch (error) {
    console.error("Error in fix-brand-constraint:", error)
    return NextResponse.json(
      { error: "Failed to remove brand constraint", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
