import { createClient } from "@/lib/supabase/server"

export async function checkIsAdmin(): Promise<boolean> {
  const supabase = createClient()

  try {
    // Get the current session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return false
    }

    // Get the user's ID from the session
    const userId = session.user?.id

    if (!userId) {
      return false
    }

    // Check if the user is in the admin_users table
    const { data: adminUser, error } = await supabase.from("admin_users").select("id").eq("user_id", userId).single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "no rows returned" which is expected if not an admin
      console.error("Error checking admin status:", error)
      return false
    }

    // If the user is in the admin_users table, they're an admin
    if (adminUser) {
      return true
    }

    // Get the user's email from the session
    const userEmail = session.user?.email

    if (!userEmail) {
      return false
    }

    // For now, we'll consider any user with email pouria.raz@mtnirancell.ir as an admin
    return userEmail === "pouria.raz@mtnirancell.ir"
  } catch (e) {
    console.error("Exception checking admin status:", e)
    return false
  }
}
