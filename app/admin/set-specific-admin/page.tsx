import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function SetSpecificAdminPage() {
  const email = "pouria.raz@mtnirancell.ir"
  const supabase = createServerComponentClient({ cookies })

  const result: { success: boolean; message?: string; error?: string; details?: any } = {
    success: false,
  }

  try {
    // First, check if the user exists in auth
    const {
      data: { users },
      error: authError,
    } = await supabase.auth.admin.listUsers()

    if (authError) {
      result.error = "Failed to list users: " + authError.message
      result.details = { type: "auth_error", message: authError.message }
      return <AdminResultPage result={result} email={email} />
    }

    // Find the user with the matching email
    const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

    let userId

    if (!user) {
      // User doesn't exist, create them
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: "Temporary123!", // Temporary password
        email_confirm: true,
      })

      if (createError) {
        result.error = "Failed to create user: " + createError.message
        result.details = { type: "create_error", message: createError.message }
        return <AdminResultPage result={result} email={email} />
      }

      userId = newUser.user.id
    } else {
      userId = user.id
    }

    if (!userId) {
      result.error = "Failed to get or create user ID"
      result.details = { type: "user_id_error" }
      return <AdminResultPage result={result} email={email} />
    }

    // Check if user already has admin role
    const { data: existingRole, error: roleCheckError } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", userId)
      .eq("name", "admin")
      .single()

    if (!roleCheckError && existingRole) {
      result.success = true
      result.message = `User ${email} is already an admin`
      return <AdminResultPage result={result} email={email} />
    }

    // Now insert the admin role directly
    const { error: insertError } = await supabase.from("user_roles").insert({
      user_id: userId,
      name: "admin",
      description: "Administrator",
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      result.error = "Failed to set admin role: " + insertError.message
      result.details = {
        type: "insert_error",
        message: insertError.message,
        hint: "Check the structure of your user_roles table",
      }
      return <AdminResultPage result={result} email={email} />
    }

    result.success = true
    result.message = `Successfully set ${email} as admin`
  } catch (error: any) {
    console.error("Error setting admin:", error)
    result.error = "Internal server error: " + error.message
    result.details = { type: "unexpected_error", error: error }
  }

  return <AdminResultPage result={result} email={email} />
}

function AdminResultPage({
  result,
  email,
}: {
  result: { success: boolean; message?: string; error?: string; details?: any }
  email: string
}) {
  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Admin Setup</CardTitle>
          <CardDescription>Setting {email} as an admin user</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className={result.success ? "bg-green-50" : "bg-red-50"}>
            {result.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
            <AlertDescription>
              {result.success ? (
                <span>{result.message || `Successfully set ${email} as admin`}</span>
              ) : (
                <div className="space-y-2">
                  <p>
                    <strong>Error:</strong> {result.error || "Failed to set admin role"}
                  </p>
                  <p>
                    <strong>Email:</strong> {email}
                  </p>
                  {result.details && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer">Technical Details</summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                  <p className="text-sm mt-2">
                    Try the{" "}
                    <Link href="/admin/auto-set-admin" className="text-blue-600 underline">
                      automatic admin setup
                    </Link>{" "}
                    as an alternative.
                  </p>
                </div>
              )}
            </AlertDescription>
          </Alert>

          {result.success && (
            <div className="mt-4 text-sm text-gray-500">
              <p>The user now has admin privileges and can access all admin features.</p>
              <p className="mt-2">If this is a new user, they will need to:</p>
              <ul className="list-disc pl-5 mt-1">
                <li>Check their email for a confirmation link</li>
                <li>Set or reset their password</li>
                <li>Log in to access admin features</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
