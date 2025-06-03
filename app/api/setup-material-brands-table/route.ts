import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Check if the table exists
    const { data: tableExists, error: checkError } = await supabase.from("material_brands").select("id").limit(1)

    if (checkError && checkError.code === "PGRST116") {
      // Table doesn't exist, create it
      try {
        // Create the table
        const { error: createError } = await supabase.rpc("create_material_brands_table")

        if (createError) {
          console.error("Error creating brands table:", createError)
          return NextResponse.json(
            { error: `Error creating brands table: ${createError.message}`, needsManualSetup: true },
            { status: 500 },
          )
        }

        // Insert default brands
        const { data: session } = await supabase.auth.getSession()
        const userId = session?.session?.user?.id

        if (userId) {
          // Insert Ericsson brand
          await supabase.from("material_brands").insert([
            {
              name: "Ericsson",
              slug: "ericsson",
              description: "Ericsson equipment and materials",
              color: "#0066B3", // Ericsson blue
              created_by: userId,
            },
          ])

          // Insert Huawei brand
          await supabase.from("material_brands").insert([
            {
              name: "Huawei",
              slug: "huawei",
              description: "Huawei equipment and materials",
              color: "#C7000B", // Huawei red
              created_by: userId,
            },
          ])
        }

        return NextResponse.json({ success: true, message: "Material brands table created successfully" })
      } catch (error: any) {
        console.error("Error setting up material brands table:", error)
        return NextResponse.json(
          { error: `Error setting up material brands table: ${error.message}`, needsManualSetup: true },
          { status: 500 },
        )
      }
    } else if (checkError) {
      console.error("Error checking table existence:", checkError)
      return NextResponse.json(
        { error: `Error checking table existence: ${checkError.message}`, needsManualSetup: true },
        { status: 500 },
      )
    }

    // Table already exists
    return NextResponse.json({ success: true, message: "Material brands table already exists" })
  } catch (error: any) {
    console.error("Error setting up material brands table:", error)
    return NextResponse.json(
      { error: `Error setting up material brands table: ${error.message}`, needsManualSetup: true },
      { status: 500 },
    )
  }
}
