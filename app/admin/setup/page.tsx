import { AdminSetupForm } from "@/components/admin/admin-setup-form"
import { ExistingUserAdminForm } from "@/components/admin/existing-user-admin-form"

export default function AdminSetupPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Admin Setup</h1>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold mb-4">Create New Admin</h2>
          <p className="text-gray-500 mb-4">Use this option to create a new user and make them an admin.</p>
          <AdminSetupForm />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Set Existing User as Admin</h2>
          <p className="text-gray-500 mb-4">
            Use this option if the user already exists and has signed in at least once.
          </p>
          <ExistingUserAdminForm />
        </div>
      </div>
    </div>
  )
}
