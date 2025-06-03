import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST() {
  const email = "pouria.raz@mtnirancell.ir"
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // First, check if the user exists
    const { data: existingUser, error: lookupError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single()

    let userId

    if (lookupError || !existingUser) {
      // User doesn't exist in profiles, try to create them
      const { data: newUser, error: createError } = await supabase.auth.signUp({
        email: email,
        password: Math.random().toString(36).slice(-10) + "Aa1!", // Random secure password
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login`,
        },
      })

      if (createError) {
        return NextResponse.json({ error: "Failed to create user: " + createError.message }, { status: 500 })
      }

      userId = newUser.user?.id

      // Insert into profiles table
      await supabase.from("profiles").insert({
        id: userId,
        email: email,
        created_at: new Date().toISOString(),
      })
    } else {
      userId = existingUser.id
    }

    if (!userId) {
      return NextResponse.json({ error: "Failed to get or create user ID" }, { status: 500 })
    }

    // Now insert the admin role using direct SQL
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        name: "admin",
        description: "Administrator",
        created_at: new Date().toISOString(),
      })
      .select()

    if (roleError) {
      // Try a different approach if the first one fails
      const { error: directSqlError } = await supabase.rpc("execute_sql", {
        sql: `
          INSERT INTO user_roles (id, user_id, name, description, created_at)
          VALUES (gen_random_uuid(), '${userId}', 'admin', 'Administrator', NOW())
          ON CONFLICT (user_id, name) DO NOTHING
        `,
      })

      if (directSqlError) {
        return NextResponse.json(
          {
            error: "Failed to set admin role: " + directSqlError.message,
            details: "Attempted both ORM and direct SQL approaches",
          },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: "Admin role assigned successfully to " + email,
      userId: userId,
    })
  } catch (error: any) {
    console.error("Error setting admin:", error)
    return NextResponse.json({ error: "Internal server error: " + error.message }, { status: 500 })
  }
}
