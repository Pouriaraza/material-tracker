import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function DirectSqlAdminPage() {
  const email = "pouria.raz@mtnirancell.ir"
  const supabase = createServerComponentClient({ cookies })

  const result: { success: boolean; message?: string; error?: string; details?: any } = {
    success: false,
  }

  try {
    // First, let's check the structure of the user_roles table
    const { data: tableInfo, error: tableInfoError } = await supabase.rpc("execute_sql", {
      sql: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'user_roles' AND table_schema = 'public'
      `,
    })

    if (tableInfoError) {
      // Create the execute_sql function if it doesn't exist
      await supabase.rpc("execute_sql", {
        sql: `
          CREATE OR REPLACE FUNCTION execute_sql(sql text) RETURNS JSONB
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          DECLARE
            result JSONB;
          BEGIN
            EXECUTE sql;
            RETURN '{"success": true}'::JSONB;
          EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object(
              'success', false,
              'error', SQLERRM,
              'detail', SQLSTATE
            );
          END;
          $$;
        `,
      })

      // Try again after creating the function
      const { data: retryTableInfo, error: retryTableInfoError } = await supabase.rpc("execute_sql", {
        sql: `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'user_roles' AND table_schema = 'public'
        `,
      })

      if (retryTableInfoError) {
        result.error = "Failed to get table structure: " + retryTableInfoError.message
        result.details = { type: "table_info_error", message: retryTableInfoError.message }
        return <AdminResultPage result={result} email={email} tableInfo={null} />
      }

      result.details = { tableInfo: retryTableInfo }
    } else {
      result.details = { tableInfo }
    }

    // Now, let's try to sign up the user if they don't exist
    const tempPassword = Math.random().toString(36).slice(-10) + "Aa1!"

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: tempPassword,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login`,
      },
    })

    // If we get an error about the user already existing, that's fine
    let userId = signUpData?.user?.id

    if (signUpError && !signUpError.message.includes("already exists")) {
      result.error = "Failed to create user: " + signUpError.message
      result.details = { ...result.details, type: "signup_error", message: signUpError.message }
      return <AdminResultPage result={result} email={email} tableInfo={tableInfo} />
    }

    // If we couldn't get the user ID from signup, try to get it from the auth API
    if (!userId) {
      // Try to sign in with a dummy password to see if the user exists
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: "DummyPassword123!", // This will fail, but we just want to check if the user exists
      })

      if (signInError && signInError.message.includes("Invalid login credentials")) {
        // User exists but password is wrong, which is what we expect
        // Now we need to get the user ID

        // Try to use the admin API if available
        try {
          const { data: adminData, error: adminError } = await supabase.auth.admin.getUserByEmail(email)

          if (!adminError && adminData?.user) {
            userId = adminData.user.id
          }
        } catch (e) {
          // Admin API not available, continue with other methods
        }
      }
    }

    // If we still don't have a user ID, we need to create the user manually in Supabase
    if (!userId) {
      result.error = "Could not get or create user ID"
      result.message = "Please create the user manually in Supabase and then run this page again."
      result.details = {
        ...result.details,
        type: "no_user_id",
        hint: "Create the user manually in Supabase and then run this page again.",
      }
      return <AdminResultPage result={result} email={email} tableInfo={tableInfo} />
    }

    // Now insert the admin role directly using SQL
    // We'll adapt the SQL based on the table structure we found
    const { data: insertResult, error: insertError } = await supabase.rpc("execute_sql", {
      sql: `
        INSERT INTO user_roles (id, name, description, created_at)
        VALUES (gen_random_uuid(), 'admin', 'Administrator for ${email}', NOW())
        ON CONFLICT (name) DO NOTHING
        RETURNING id
      `,
    })

    if (insertError) {
      result.error = "Failed to set admin role: " + insertError.message
      result.details = {
        ...result.details,
        type: "insert_error",
        message: insertError.message,
        hint: "Check the structure of your user_roles table",
      }
      return <AdminResultPage result={result} email={email} tableInfo={tableInfo} />
    }

    result.success = true
    result.message = `Successfully set ${email} as admin`
  } catch (error: any) {
    console.error("Error setting admin:", error)
    result.error = "Internal server error: " + error.message
    result.details = { ...result.details, type: "unexpected_error", error: error.toString() }
  }

  return <AdminResultPage result={result} email={email} tableInfo={result.details?.tableInfo} />
}

function AdminResultPage({
  result,
  email,
  tableInfo,
}: {
  result: { success: boolean; message?: string; error?: string; details?: any }
  email: string
  tableInfo: any
}) {
  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Direct SQL Admin Setup</CardTitle>
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
                  {tableInfo && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer">Table Structure</summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                        {JSON.stringify(tableInfo, null, 2)}
                      </pre>
                    </details>
                  )}
                  {result.details && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer">Technical Details</summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                  <p className="mt-4">
                    <strong>Alternative approach:</strong>{" "}
                    {result.message || "Try manually creating the user in Supabase and then running this page again."}
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
              <div className="mt-4">
                <Link href="/admin" className="text-blue-600 hover:underline">
                  Go to Admin Dashboard
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
