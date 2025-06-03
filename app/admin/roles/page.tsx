import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { checkIsAdmin } from "@/lib/auth-utils"
import { AdminBackButton } from "@/components/admin/admin-back-button"
import { RolesManagement } from "@/components/admin/roles-management"

export default async function AdminRolesPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Check if the current user is an admin
  const isAdmin = await checkIsAdmin(session.user.id)

  // If not admin, redirect to dashboard
  if (!isAdmin) {
    redirect("/dashboard")
  }

  // Get all roles
  const { data: roles } = await supabase.from("user_roles").select("role").order("role")

  // Get unique roles
  const uniqueRoles = [...new Set(roles?.map((r) => r.role) || ["admin"])]

  return (
    <div className="container py-10">
      <div className="flex items-center mb-6">
        <AdminBackButton />
        <div>
          <h1 className="text-3xl font-bold">Roles & Permissions</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role Management</CardTitle>
          <CardDescription>Create and manage user roles</CardDescription>
        </CardHeader>
        <CardContent>
          <RolesManagement roles={uniqueRoles} />
        </CardContent>
      </Card>
    </div>
  )
}
