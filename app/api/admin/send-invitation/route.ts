import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { email, role, isAdmin } = await request.json()

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check admin status
    const { data: adminCheck } = await supabase.from("admin_users").select("id").eq("user_id", user.id).single()

    if (!adminCheck) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Check if user already exists
    const { data: existingUser } = await supabase.from("profiles").select("id").eq("email", email).single()

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    // Check if invitation already exists
    const { data: existingInvitation } = await supabase
      .from("user_invitations")
      .select("id")
      .eq("email", email)
      .eq("status", "pending")
      .single()

    if (existingInvitation) {
      return NextResponse.json({ error: "Pending invitation already exists for this email" }, { status: 400 })
    }

    // Create invitation
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

    const { error: inviteError } = await supabase.from("user_invitations").insert({
      email,
      role: role || "user",
      is_admin: isAdmin || false,
      invited_by: user.id,
      expires_at: expiresAt.toISOString(),
      status: "pending",
    })

    if (inviteError) {
      console.error("Error creating invitation:", inviteError)
      return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 })
    }

    // Send magic link (optional - you might want to handle this differently)
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
      })

      if (authError) {
        console.warn("Error sending magic link:", authError)
        // Don't fail the whole operation if email sending fails
      }
    } catch (emailError) {
      console.warn("Error sending invitation email:", emailError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in send-invitation API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
