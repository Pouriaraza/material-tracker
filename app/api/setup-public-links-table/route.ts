import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check if the user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Create the public_links table if it doesn't exist
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sheet_id UUID NOT NULL,
        access_key TEXT NOT NULL UNIQUE,
        created_by UUID NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_public_links_access_key ON public_links(access_key);
      CREATE INDEX IF NOT EXISTS idx_public_links_sheet_id ON public_links(sheet_id);
    `

    // Execute the SQL directly
    const { error } = await supabase
      .rpc("execute_sql", {
        sql_query: createTableSQL,
      })
      .catch(() => {
        // If the RPC doesn't exist, try a different approach
        return { error: { message: "RPC not available" } }
      })

    if (error) {
      console.error("Error creating public_links table:", error)

      // Try a different approach - check if the table exists
      const { error: checkError } = await supabase.from("public_links").select("id").limit(1)

      if (checkError && checkError.message && checkError.message.includes("does not exist")) {
        return NextResponse.json({ error: "Table does not exist and could not be created" }, { status: 500 })
      } else {
        // Table might exist already
        return NextResponse.json({ message: "Table might already exist" })
      }
    }

    return NextResponse.json({ message: "Public links table created or already exists" })
  } catch (error) {
    console.error("Error in setup-public-links-table API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
