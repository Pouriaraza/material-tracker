import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing",
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing",
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ Set" : "❌ Missing",
      },
      connections: {
        regularClient: "❌ Failed",
        adminClient: "❌ Failed",
      },
      tables: {
        settlement_items: "❌ Not found",
        user_roles: "❌ Not found",
        profiles: "❌ Not found",
      },
      errors: [] as string[],
    }

    // Test regular client connection
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("settlement_items").select("count").limit(1)
      if (!error) {
        results.connections.regularClient = "✅ Connected"
        results.tables.settlement_items = "✅ Found"
      } else if (error.message.includes("does not exist")) {
        results.connections.regularClient = "✅ Connected"
        results.tables.settlement_items = "❌ Table not found"
      } else {
        results.errors.push(`Regular client error: ${error.message}`)
      }
    } catch (error) {
      results.errors.push(
        `Regular client connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    }

    // Test admin client connection
    try {
      const adminSupabase = createAdminClient()
      const { data, error } = await adminSupabase.from("settlement_items").select("count").limit(1)
      if (!error) {
        results.connections.adminClient = "✅ Connected"
        results.tables.settlement_items = "✅ Found"
      } else if (error.message.includes("does not exist")) {
        results.connections.adminClient = "✅ Connected"
        results.tables.settlement_items = "❌ Table not found"
      } else {
        results.errors.push(`Admin client error: ${error.message}`)
      }
    } catch (error) {
      results.errors.push(`Admin client connection failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }

    // Test other tables
    try {
      const adminSupabase = createAdminClient()

      // Check user_roles table
      const { error: userRolesError } = await adminSupabase.from("user_roles").select("count").limit(1)
      if (!userRolesError) {
        results.tables.user_roles = "✅ Found"
      } else if (!userRolesError.message.includes("does not exist")) {
        results.errors.push(`User roles table error: ${userRolesError.message}`)
      }

      // Check profiles table
      const { error: profilesError } = await adminSupabase.from("profiles").select("count").limit(1)
      if (!profilesError) {
        results.tables.profiles = "✅ Found"
      } else if (!profilesError.message.includes("does not exist")) {
        results.errors.push(`Profiles table error: ${profilesError.message}`)
      }
    } catch (error) {
      results.errors.push(`Table check failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
