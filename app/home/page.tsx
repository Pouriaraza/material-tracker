import type React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FileSpreadsheet, Building, UserCircle, Bell, Clock, Calendar, Search, Plus } from "lucide-react"
import { checkIsAdmin } from "@/lib/auth-utils"
import { HomeNavigation } from "@/components/home/home-navigation"
import { RecentActivity } from "@/components/home/recent-activity"
import { SystemStatus } from "@/components/home/system-status"
import { UserStats } from "@/components/home/user-stats"
import { Announcements } from "@/components/home/announcements"
import { LogoutButton } from "@/components/auth/logout-button"

export const metadata: Metadata = {
  title: "Home | Tracker App",
  description: "Welcome to your personalized home page",
}

async function getHomePageData() {
  const supabase = createClient()

  // Get recent trackers
  const { data: trackers } = await supabase
    .from("trackers")
    .select("id, name, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(5)

  // Get recent reserve items
  const { data: reserveItems } = await supabase
    .from("reserve_items")
    .select("id, name, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(5)

  // Get user count
  const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true })

  // Get tracker count
  const { count: trackerCount } = await supabase.from("trackers").select("*", { count: "exact", head: true })

  // Get reserve item count
  const { count: reserveItemCount } = await supabase.from("reserve_items").select("*", { count: "exact", head: true })

  return {
    trackers: trackers || [],
    reserveItems: reserveItems || [],
    stats: {
      userCount: userCount || 0,
      trackerCount: trackerCount || 0,
      reserveItemCount: reserveItemCount || 0,
    },
  }
}

export default async function HomePage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  const userIsAdmin = await checkIsAdmin() // No longer passing userId
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

  const { trackers, reserveItems, stats } = await getHomePageData()

  // Get user's last login time
  const { data: authUser } = await supabase
    .from("auth.users")
    .select("last_sign_in_at")
    .eq("id", session.user.id)
    .single()

  const lastLogin = authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at) : null

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Welcome Banner */}
      <div className="mb-8 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!
            </h1>
            <p className="mt-1 text-blue-100">
              {lastLogin
                ? `Last login: ${lastLogin.toLocaleDateString()} at ${lastLogin.toLocaleTimeString()}`
                : "Welcome to your personalized dashboard"}
            </p>
          </div>
          <div className="mt-4 flex gap-2 md:mt-0">
            <Button variant="secondary" size="sm" asChild>
              <Link href="/profile">
                <UserCircle className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </Button>
            <Button variant="secondary" size="sm">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Sidebar - Navigation */}
        <div className="md:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle>Quick Navigation</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <HomeNavigation isAdmin={userIsAdmin} />
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6 md:col-span-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <QuickActionButton icon={<Plus className="h-4 w-4" />} label="New Tracker" href="/trackers/new" />
                <QuickActionButton
                  icon={<FileSpreadsheet className="h-4 w-4" />}
                  label="New Sheet"
                  href="/sheets/new"
                />
                <QuickActionButton icon={<Search className="h-4 w-4" />} label="Search" href="/search" />
                <QuickActionButton icon={<Building className="h-4 w-4" />} label="Sites" href="/sites" />
                <LogoutButton quickAction />
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest updates and changes</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentActivity trackers={trackers} reserveItems={reserveItems} />
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full">
                <Clock className="mr-2 h-4 w-4" />
                View All Activity
              </Button>
            </CardFooter>
          </Card>

          {/* Announcements */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Announcements</CardTitle>
              <CardDescription>Important updates and information</CardDescription>
            </CardHeader>
            <CardContent>
              <Announcements />
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Stats and Status */}
        <div className="space-y-6 md:col-span-3">
          {/* User Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Your Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <UserStats stats={stats} />
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <SystemStatus />
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Upcoming</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">No upcoming events</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full">
                <Calendar className="mr-2 h-4 w-4" />
                View Calendar
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}

function QuickActionButton({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <Button asChild variant="outline" className="flex h-20 w-full flex-col items-center justify-center gap-1 p-2">
      <Link href={href}>
        <div className="rounded-full bg-primary/10 p-2">{icon}</div>
        <span className="text-xs font-medium">{label}</span>
      </Link>
    </Button>
  )
}
