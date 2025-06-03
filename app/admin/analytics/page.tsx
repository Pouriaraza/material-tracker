import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminBackButton } from "@/components/admin/admin-back-button"
import { UserActivityChart } from "@/components/admin/user-activity-chart"
import { SystemUsageChart } from "@/components/admin/system-usage-chart"

export default async function AdminAnalyticsPage() {
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
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">View system analytics and usage statistics</p>
        </div>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users">User Activity</TabsTrigger>
          <TabsTrigger value="system">System Usage</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Activity</CardTitle>
              <CardDescription>User registrations and logins over time</CardDescription>
            </CardHeader>
            <CardContent>
              <UserActivityChart />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Usage</CardTitle>
              <CardDescription>Resource usage and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <SystemUsageChart />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
