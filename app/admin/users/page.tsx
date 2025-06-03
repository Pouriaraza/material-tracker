import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { UserManagement } from "@/components/admin/user-management"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AdminUsersPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login?redirect=/admin/users")
  }

  // For now, we'll consider any user with email pouria.raz@mtnirancell.ir as an admin
  const isAdmin = session.user.email === "pouria.raz@mtnirancell.ir"

  // If not admin, redirect to dashboard
  if (!isAdmin) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Access Denied</h1>

        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Admin privileges required</AlertTitle>
          <AlertDescription>
            <p>You don't have admin privileges to access this page.</p>
            <p className="mt-2">Current user: {session.user.email}</p>
          </AlertDescription>
        </Alert>

        <div className="flex justify-between">
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">User Management</h1>
      <UserManagement currentUser={session.user} />
    </div>
  )
}
