import { createClient } from "@/lib/supabase/server"

export async function checkIsAdmin(): Promise<boolean> {
  try {
    const supabase = createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return false
    }

    // Try using the RPC function first
    try {
      const { data: isAdminRpc, error: rpcError } = await supabase.rpc("check_user_is_admin", {
        input_user_id: user.id,
      })

      if (!rpcError && typeof isAdminRpc === "boolean") {
        return isAdminRpc
      }
    } catch (rpcError) {
      console.log("RPC function not available, using direct query")
    }

    // Fallback: Direct query to admin_users table
    try {
      const { data: adminData, error: adminError } = await supabase
        .from("admin_users")
        .select("is_active")
        .eq("user_id", user.id)
        .single()

      if (!adminError && adminData) {
        return adminData.is_active !== false // true if null or true
      }
    } catch (directError) {
      console.log("Direct admin query failed, checking by email")
    }

    // Final fallback: Check if user email is in a predefined admin list
    const adminEmails = [
      "admin@example.com", // Add your admin emails here
    ]

    return adminEmails.includes(user.email || "")
  } catch (error) {
    console.error("Error checking admin status:", error)
    return false
  }
}

export async function getCurrentUser() {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

export async function getUserProfile(userId: string) {
  try {
    const supabase = createClient()
    const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

    if (error) {
      console.error("Error getting user profile:", error)
      return null
    }

    return profile
  } catch (error) {
    console.error("Error getting user profile:", error)
    return null
  }
}

export async function requireAdmin(): Promise<void> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    throw new Error("Admin access required")
  }
}
