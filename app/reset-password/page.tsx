import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export default async function ResetPasswordPage() {
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
          <h1 className="text-3xl font-bold">Reset Password</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter your email to reset your password</p>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  )
}
