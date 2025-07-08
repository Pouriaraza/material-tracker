import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"

interface BulkAddResult {
  email: string
  success: boolean
  message: string
  action: "created" | "existing" | "invited" | "error"
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc("check_user_is_admin", {
      input_user_id: user.id,
    })

    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { emails, send_invitations = true, make_admin = false } = await request.json()

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "Email list is required" }, { status: 400 })
    }

    const results = {
      total: emails.length,
      successful: 0,
      failed: 0,
      details: [] as Array<{
        email: string
        status: "success" | "error" | "exists"
        message: string
        user_id?: string
      }>,
    }

    // Process each email
    for (const email of emails) {
      const trimmedEmail = email.trim().toLowerCase()

      if (!trimmedEmail || !trimmedEmail.includes("@")) {
        results.failed++
        results.details.push({
          email: trimmedEmail,
          status: "error",
          message: "Invalid email format",
        })
        continue
      }

      try {
        // Check if user already exists in profiles
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .eq("email", trimmedEmail)
          .single()

        if (existingProfile) {
          // User already exists
          results.details.push({
            email: trimmedEmail,
            status: "exists",
            message: "User already exists",
            user_id: existingProfile.id,
          })

          // If make_admin is true, add to admin_users
          if (make_admin) {
            const { error: adminError } = await supabase.from("admin_users").upsert(
              {
                user_id: existingProfile.id,
                is_active: true,
                created_by: user.id,
              },
              { onConflict: "user_id" },
            )

            if (!adminError) {
              results.details[results.details.length - 1].message += " (made admin)"
            }
          }

          results.successful++
          continue
        }

        // Create new user profile
        const newUserId = crypto.randomUUID()

        const { error: profileError } = await supabase.from("profiles").insert({
          id: newUserId,
          email: trimmedEmail,
          full_name: null,
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (profileError) {
          results.failed++
          results.details.push({
            email: trimmedEmail,
            status: "error",
            message: `Failed to create profile: ${profileError.message}`,
          })
          continue
        }

        // Add to admin_users if requested
        if (make_admin) {
          await supabase.from("admin_users").insert({
            user_id: newUserId,
            is_active: true,
            created_by: user.id,
          })
        }

        // Send invitation if requested
        if (send_invitations) {
          const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(trimmedEmail, {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
          })

          if (inviteError) {
            results.details.push({
              email: trimmedEmail,
              status: "error",
              message: `Profile created but invitation failed: ${inviteError.message}`,
              user_id: newUserId,
            })
            results.failed++
          } else {
            results.details.push({
              email: trimmedEmail,
              status: "success",
              message: make_admin ? "User created, invitation sent, made admin" : "User created and invitation sent",
              user_id: newUserId,
            })
            results.successful++
          }
        } else {
          results.details.push({
            email: trimmedEmail,
            status: "success",
            message: make_admin ? "User created and made admin" : "User created",
            user_id: newUserId,
          })
          results.successful++
        }
      } catch (error) {
        console.error(`Error processing ${trimmedEmail}:`, error)
        results.failed++
        results.details.push({
          email: trimmedEmail,
          status: "error",
          message: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.total} emails: ${results.successful} successful, ${results.failed} failed`,
      results,
    })
  } catch (error) {
    console.error("Error in bulk add users:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
