import { UpdatePasswordForm } from "@/components/auth/update-password-form"

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Update Password</h1>
          <p className="mt-2 text-sm text-muted-foreground">Create a new password for your account</p>
        </div>
        <UpdatePasswordForm />
      </div>
    </div>
  )
}
