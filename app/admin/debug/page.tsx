import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AdminDebugPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const user = session?.user

  // Check if user_roles table exists
  const { error: tableCheckError } = await supabase.from("user_roles").select("id").limit(1)

  // Get all user roles
  const { data: userRoles, error: rolesError } = await supabase.from("user_roles").select("*")

  // Check current user's admin status
  let isAdmin = false
  let adminCheckError = null

  if (user) {
    const { data: userRole, error } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", user.id)
      .eq("name", "admin")
      .maybeSingle()

    isAdmin = !!userRole
    adminCheckError = error
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Admin Debug Page</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Current User</CardTitle>
            <CardDescription>Information about the current logged-in user</CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-2">
                <p>
                  <strong>Email:</strong> {user.email}
                </p>
                <p>
                  <strong>User ID:</strong> {user.id}
                </p>
                <p>
                  <strong>Is Admin:</strong> {isAdmin ? "Yes" : "No"}
                </p>
                {adminCheckError && (
                  <Alert variant="destructive">
                    <AlertTitle>Admin Check Error</AlertTitle>
                    <AlertDescription>{adminCheckError.message}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <Alert>
                <AlertTitle>Not Logged In</AlertTitle>
                <AlertDescription>No user is currently logged in</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database Status</CardTitle>
            <CardDescription>Information about the database tables</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <strong>user_roles Table:</strong>{" "}
                {tableCheckError ? (
                  <span className="text-red-500">Error: {tableCheckError.message}</span>
                ) : (
                  <span className="text-green-500">Exists</span>
                )}
              </p>

              {rolesError && (
                <Alert variant="destructive">
                  <AlertTitle>Roles Query Error</AlertTitle>
                  <AlertDescription>{rolesError.message}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>User Roles</CardTitle>
          <CardDescription>All roles in the user_roles table</CardDescription>
        </CardHeader>
        <CardContent>
          {userRoles && userRoles.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userRoles.map((role) => (
                    <tr key={role.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{role.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.user_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(role.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Alert>
              <AlertTitle>No Roles Found</AlertTitle>
              <AlertDescription>
                {rolesError ? "Error fetching roles" : "No roles exist in the database"}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button asChild>
          <Link href="/admin/auto-set-admin">Set Admin User</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin">Back to Admin</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
