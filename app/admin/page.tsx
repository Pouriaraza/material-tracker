import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserCog, Settings, BarChart3, ClipboardList, Shield, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AdminDashboardPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login?redirect=/admin")
  }

  // Check if the admin role exists
  const { data: adminRole, error: roleError } = await supabase
    .from("user_roles")
    .select("*")
    .eq("name", "admin")
    .maybeSingle()

  // If there was an error checking admin status, show debugging info
  if (roleError) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Admin Access Error</h1>

        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error checking admin privileges</AlertTitle>
          <AlertDescription>
            <p className="mb-2">There was an error checking if you have admin privileges:</p>
            <p className="font-mono text-sm bg-gray-100 p-2 rounded">{roleError.message}</p>

            <div className="mt-4">
              <p className="font-semibold">Debugging Information:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>User ID: {session.user.id}</li>
                <li>Email: {session.user.email}</li>
                <li>Error Code: {roleError.code}</li>
              </ul>
            </div>

            <div className="mt-4">
              <p className="font-semibold">Possible Solutions:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Make sure the user_roles table exists in your database</li>
                <li>Ensure the user has been properly set as an admin</li>
                <li>Check database permissions for the authenticated user</li>
              </ul>
            </div>

            <div className="mt-4">
              <Link href="/admin/auto-set-admin" className="text-blue-600 hover:underline">
                Try setting admin privileges again
              </Link>
            </div>
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

  // For now, we'll consider any user with email pouria.raz@mtnirancell.ir as an admin
  const isAdmin = session.user.email === "pouria.raz@mtnirancell.ir"

  // If not admin, show access denied
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

            <div className="mt-4">
              <p className="font-semibold">If you believe this is an error:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Make sure you're logged in with the correct account</li>
                <li>Contact a system administrator to grant you admin privileges</li>
                <li>Try setting admin privileges using the auto-admin page</li>
              </ul>
            </div>

            <div className="mt-4">
              <Link href="/admin/auto-set-admin" className="text-blue-600 hover:underline">
                Try setting admin privileges
              </Link>
            </div>
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

  // Admin dashboard content
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-muted-foreground mb-6">Manage your application and users</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <UserCog className="mr-2 h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>Manage users and permissions</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            Add, edit, or remove users. Assign admin privileges and manage user roles.
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/admin/users">Manage Users</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Analytics
            </CardTitle>
            <CardDescription>View system analytics</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            View usage statistics, user activity, and system performance metrics.
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/admin/analytics">View Analytics</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              System Settings
            </CardTitle>
            <CardDescription>Configure application settings</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            Manage application configuration, defaults, and global settings.
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/admin/settings">System Settings</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <ClipboardList className="mr-2 h-5 w-5" />
              Activity Logs
            </CardTitle>
            <CardDescription>View system activity</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            Review user actions, system events, and audit trails for security monitoring.
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/admin/logs">View Logs</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Roles & Permissions
            </CardTitle>
            <CardDescription>Manage access control</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            Define user roles and set granular permissions for different parts of the application.
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/admin/roles">Manage Roles</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
