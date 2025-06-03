import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminBackButton } from "@/components/admin/admin-back-button"
import { SystemSettingsForm } from "@/components/admin/system-settings-form"

export default async function AdminSettingsPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Check if the current user is an admin (using email directly)
  const isAdmin = session.user.email === "pouria.raz@mtnirancell.ir"

  // If not admin, redirect to dashboard
  if (!isAdmin) {
    redirect("/dashboard")
  }

  // Get current settings (or use defaults)
  const defaultSettings = {
    siteName: "Tracker App",
    allowSignup: true,
    itemsPerPage: 10,
    enableNotifications: true,
    maintenanceMode: false,
  }

  return (
    <div className="container py-10">
      <div className="flex items-center mb-6">
        <AdminBackButton />
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">Configure application settings</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>Configure global settings for the application</CardDescription>
        </CardHeader>
        <CardContent>
          <SystemSettingsForm initialSettings={defaultSettings} />
        </CardContent>
      </Card>
    </div>
  )
}
