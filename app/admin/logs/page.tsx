import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminBackButton } from "@/components/admin/admin-back-button"
import { ActivityLogs } from "@/components/admin/activity-logs"

export default async function AdminLogsPage() {
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

  return (
    <div className="container py-10">
      <div className="flex items-center mb-6">
        <AdminBackButton />
        <div>
          <h1 className="text-3xl font-bold">Activity Logs</h1>
          <p className="text-muted-foreground">View system activity and audit trails</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Activity</CardTitle>
          <CardDescription>Recent actions and events in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityLogs />
        </CardContent>
      </Card>
    </div>
  )
}
