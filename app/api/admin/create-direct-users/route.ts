import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = createClient()

  try {
    // Check if user is authenticated and is admin
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if current user is admin
    const { data: adminCheck } = await supabase.from("admin_users").select("id").eq("user_id", session.user.id).single()

    if (!adminCheck) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { users } = await request.json()

    if (!users || !Array.isArray(users)) {
      return NextResponse.json({ error: "Users array is required" }, { status: 400 })
    }

    const results = []

    for (const userData of users) {
      const { email, full_name, first_name, last_name, role = "user", is_admin = false } = userData

      if (!email) {
        results.push({
          email: email || "unknown",
          status: "error",
          message: "Email is required",
        })
        continue
      }

      try {
        // Check if user already exists
        const { data: existingUser } = await supabase.from("profiles").select("id, email").eq("email", email).single()

        if (existingUser) {
          results.push({
            email,
            status: "exists",
            message: "User already exists",
            user_id: existingUser.id,
          })
          continue
        }

        // Generate a random UUID for the user
        const userId = crypto.randomUUID()

        // Insert directly into profiles table
        const { data: newUser, error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            email,
            full_name: full_name || email.split("@")[0],
            first_name,
            last_name,
            role,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (profileError) {
          results.push({
            email,
            status: "error",
            message: `Failed to create profile: ${profileError.message}`,
          })
          continue
        }

        // If user should be admin, add to admin_users table
        if (is_admin) {
          const { error: adminError } = await supabase.from("admin_users").insert({
            user_id: userId,
            created_by: session.user.id,
          })

          if (adminError) {
            results.push({
              email,
              status: "partial",
              message: `User created but admin role failed: ${adminError.message}`,
              user_id: userId,
            })
            continue
          }
        }

        results.push({
          email,
          status: "created",
          message: "User created successfully",
          user_id: userId,
          is_admin,
        })
      } catch (error: any) {
        results.push({
          email,
          status: "error",
          message: error.message || "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: users.length,
        created: results.filter((r) => r.status === "created").length,
        exists: results.filter((r) => r.status === "exists").length,
        errors: results.filter((r) => r.status === "error").length,
        partial: results.filter((r) => r.status === "partial").length,
      },
    })
  } catch (error: any) {
    console.error("Error creating direct users:", error)
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 },
    )
  }
}
