import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { UserProfile } from "@/components/profile/user-profile"

export default async function ProfilePage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Check if user is admin
  const { data: userRole } = await supabase
    .from("user_roles")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("role", "admin")
    .maybeSingle()

  const isAdmin = !!userRole

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
      <UserProfile user={session.user} isAdmin={isAdmin} />
    </div>
  )
}
