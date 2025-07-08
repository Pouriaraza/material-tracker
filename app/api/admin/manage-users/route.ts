import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { checkIsAdmin } from "@/lib/auth-utils"

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Verify the user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { action, userId } = await request.json()

    if (!action || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if any admin users exist
    const { count: adminCount, error: countError } = await supabase
      .from("admin_users")
      .select("*", { count: "exact", head: true })

    if (countError) {
      console.error("Error counting admin users:", countError)
      return NextResponse.json({ error: "Error checking admin users" }, { status: 500 })
    }

    // For the bootstrap case (first admin) or if the user is already an admin
    const isFirstAdmin = adminCount === 0
    const isAdmin = (await checkIsAdmin()) || isFirstAdmin

    // For the "ensure-admin" action, we'll allow it for the first admin or if the user is already an admin
    if (action === "ensure-admin") {
      // If this is the first admin or the user is already an admin via checkIsAdmin
      if (isFirstAdmin || isAdmin) {
        // Check if the user is already in the admin_users table
        const { data: existingAdmin, error: checkError } = await supabase
          .from("admin_users")
          .select("id")
          .eq("user_id", userId)
          .single()

        if (checkError && checkError.code !== "PGRST116") {
          console.error("Error checking existing admin:", checkError)
          return NextResponse.json({ error: "Error checking admin status" }, { status: 500 })
        }

        if (!existingAdmin) {
          // Add the user as an admin
          const { data, error } = await supabase.from("admin_users").insert({ user_id: userId }).select()

          if (error) {
            console.error("Error inserting admin user:", error)
            return NextResponse.json({ error: "Error creating admin user" }, { status: 500 })
          }

          return NextResponse.json({ success: true, data, created: true })
        }

        return NextResponse.json({ success: true, data: existingAdmin, created: false })
      } else {
        // Check if the user is already an admin in the database
        const { data: adminCheck, error: adminCheckError } = await supabase
          .from("admin_users")
          .select("id")
          .eq("user_id", user.id)
          .single()

        if (adminCheckError && adminCheckError.code !== "PGRST116") {
          console.error("Error checking admin status:", adminCheckError)
          return NextResponse.json({ error: "Error checking admin status" }, { status: 500 })
        }

        if (adminCheck) {
          // User is an admin in the database
          return NextResponse.json({ success: true, data: adminCheck, created: false })
        }

        return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
      }
    }

    // For other actions, require admin status
    if (!isAdmin) {
      // Check if the user is an admin in the database
      const { data: adminCheck, error: adminCheckError } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (adminCheckError && adminCheckError.code !== "PGRST116") {
        console.error("Error checking admin status:", adminCheckError)
        return NextResponse.json({ error: "Error checking admin status" }, { status: 500 })
      }

      if (!adminCheck) {
        return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
      }
    }

    if (action === "add-admin") {
      // Add user as admin
      const { data, error } = await supabase.from("admin_users").insert({ user_id: userId }).select()

      if (error) {
        console.error("Error adding admin:", error)
        return NextResponse.json({ error: "Error adding admin user" }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    } else if (action === "remove-admin") {
      // Remove admin status
      const { data, error } = await supabase.from("admin_users").delete().eq("user_id", userId).select()

      if (error) {
        console.error("Error removing admin:", error)
        return NextResponse.json({ error: "Error removing admin user" }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("Admin API error:", error)
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 },
    )
  }
}
