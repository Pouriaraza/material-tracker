import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = createClient()

  try {
    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { emails } = await request.json()

    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json({ error: "Emails array is required" }, { status: 400 })
    }

    const results = []

    for (const email of emails) {
      try {
        // Check if user already exists in profiles
        const { data: existingUser, error: checkError } = await supabase
          .from("profiles")
          .select("id, email")
          .eq("email", email)
          .single()

        if (existingUser) {
          results.push({
            email,
            status: "exists",
            message: "User already exists",
            user_id: existingUser.id,
          })
          continue
        }

        // Create user invitation
        const { data: invitation, error: inviteError } = await supabase
          .from("user_invitations")
          .insert({
            email,
            invited_by: session.user.id,
            role: "user",
            is_admin: false,
            status: "pending",
          })
          .select()
          .single()

        if (inviteError) {
          results.push({
            email,
            status: "error",
            message: `Failed to create invitation: ${inviteError.message}`,
          })
          continue
        }

        // Send magic link invitation
        const { error: authError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
          },
        })

        if (authError) {
          results.push({
            email,
            status: "invitation_created",
            message: `Invitation created but email failed: ${authError.message}`,
            invitation_id: invitation.id,
          })
        } else {
          results.push({
            email,
            status: "invited",
            message: "Invitation sent successfully",
            invitation_id: invitation.id,
          })
        }
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
        total: emails.length,
        invited: results.filter((r) => r.status === "invited").length,
        exists: results.filter((r) => r.status === "exists").length,
        errors: results.filter((r) => r.status === "error").length,
      },
    })
  } catch (error: any) {
    console.error("Error adding test users:", error)
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 },
    )
  }
}
