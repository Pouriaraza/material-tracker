import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SignupForm } from "@/components/auth/signup-form"

export default async function SignupPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Site Tracker</h1>
          <p className="mt-2 text-sm text-muted-foreground">Create a new account</p>
        </div>
        <SignupForm />
      </div>
    </div>
  )
}
