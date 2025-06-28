import type React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { UserCircle, Bell } from "lucide-react"
import { checkIsAdmin } from "@/lib/auth-utils"
import { HomeNavigation } from "@/components/home/home-navigation"
import { RecentActivity } from "@/components/home/recent-activity"
import { SystemStatus } from "@/components/home/system-status"
import { UserStats } from "@/components/home/user-stats"
import { Announcements } from "@/components/home/announcements"
import { LogoutButton } from "@/components/auth/logout-button"
import { Suspense } from "react"
import { QuickActions } from "@/components/home/quick-actions"

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

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
  )
}

export default async function HomePage() {
  const supabase = createClient()

  try {
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
      <div className="container mx-auto py-6 px-4 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {session.user.email?.split("@")[0]}!</h1>
            <p className="text-muted-foreground">Here's what's happening with your projects today.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="secondary" size="sm" asChild className="w-full sm:w-auto">
              <Link href="/profile">
                <UserCircle className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </Button>
            <Button variant="secondary" size="sm" className="w-full sm:w-auto">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </Button>
            <LogoutButton quickAction />
          </div>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <HomeNavigation isAdmin={userIsAdmin} />
              <QuickActions />
              <RecentActivity trackers={trackers} reserveItems={reserveItems} />
            </div>
            <div className="space-y-8">
              <UserStats stats={stats} />
              <SystemStatus />
              <Announcements />
            </div>
          </div>
        </Suspense>
      </div>
    )
  } catch (error) {
    console.error("Error in HomePage:", error)
    redirect("/login")
  }
}

function QuickActionButton({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <Button
      asChild
      variant="outline"
      className="flex h-16 sm:h-20 w-full flex-col items-center justify-center gap-1 p-2 bg-transparent"
    >
      <Link href={href}>
        <div className="rounded-full bg-primary/10 p-1.5 sm:p-2">{icon}</div>
        <span className="text-xs font-medium text-center leading-tight">{label}</span>
      </Link>
    </Button>
  )
}
