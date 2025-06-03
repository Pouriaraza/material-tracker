import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const { email } = await request.json()

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Check if the user exists
    const { data: existingUser, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    let userId = existingUser?.id

    if (!userId) {
      // User doesn't exist in profiles, try to create them
      // Generate a random password
      const randomPassword =
        Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10).toUpperCase() + "1!"

      // Create the user
      const { data: newUser, error: createError } = await supabase.auth.signUp({
        email,
        password: randomPassword,
        options: {
          emailRedirectTo: `${new URL(request.url).origin}/login`,
        },
      })

      if (createError) {
        return NextResponse.json(
          {
            error: "Failed to create user: " + createError.message,
          },
          { status: 500 },
        )
      }

      userId = newUser?.user?.id

      if (!userId) {
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
      }

      // Insert into profiles table
      const { error: profileError } = await supabase.from("profiles").insert([{ id: userId, email: email }])

      if (profileError) {
        console.error("Error creating profile:", profileError)
      }
    }

    // Check if user is already an admin
    const { data: existingRole, error: roleError } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", userId)
      .eq("name", "admin") // Using 'name' instead of 'role'
      .maybeSingle()

    if (existingRole) {
      return NextResponse.json({ message: "User is already an admin" }, { status: 200 })
    }

    // Add admin role
    const { error: insertError } = await supabase.from("user_roles").insert([
      {
        user_id: userId,
        name: "admin", // Using 'name' instead of 'role'
        description: "Administrator with full access",
      },
    ])

    if (insertError) {
      return NextResponse.json({ error: "Failed to set admin role: " + insertError.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        message: existingUser
          ? "Admin role assigned successfully"
          : "User created and admin role assigned successfully. Check email for confirmation link.",
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("Error setting up admin:", error)
    return NextResponse.json({ error: "Internal server error: " + error.message }, { status: 500 })
  }
}
