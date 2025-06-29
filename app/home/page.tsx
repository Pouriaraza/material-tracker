import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { HomeNavigation } from "@/components/home/home-navigation"
import { QuickActions } from "@/components/home/quick-actions"
import { RecentActivity } from "@/components/home/recent-activity"
import { UserStats } from "@/components/home/user-stats"
import { SystemStatus } from "@/components/home/system-status"
import { Announcements } from "@/components/home/announcements"
import { Loader2 } from "lucide-react"

// Force dynamic rendering to handle cookies properly
export const dynamic = "force-dynamic"

async function HomeContent() {
  try {
    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      redirect("/login")
    }

    // Get user profile
    let userProfile = null
    try {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

      userProfile = profile
    } catch (error) {
      console.error("Error fetching user profile:", error)
    }

    // Get recent activity
    let recentActivity = []
    try {
      const { data: activity } = await supabase
        .from("tracker_logs")
        .select(`
          *,
          tracker:trackers(name)
        `)
        .order("created_at", { ascending: false })
        .limit(5)

      recentActivity = activity || []
    } catch (error) {
      console.error("Error fetching recent activity:", error)
    }

    // Get user stats
    const userStats = {
      totalTrackers: 0,
      activeTrackers: 0,
      completedTrackers: 0,
      totalSheets: 0,
    }

    try {
      const [trackersResult, sheetsResult] = await Promise.all([
        supabase.from("trackers").select("status").eq("created_by", session.user.id),
        supabase.from("sheets").select("id").eq("created_by", session.user.id),
      ])

      if (trackersResult.data) {
        userStats.totalTrackers = trackersResult.data.length
        userStats.activeTrackers = trackersResult.data.filter((t) => t.status === "active").length
        userStats.completedTrackers = trackersResult.data.filter((t) => t.status === "completed").length
      }

      if (sheetsResult.data) {
        userStats.totalSheets = sheetsResult.data.length
      }
    } catch (error) {
      console.error("Error fetching user stats:", error)
    }

    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Welcome back, {userProfile?.full_name || session.user.email}!</h1>
          <p className="text-muted-foreground">Here's what's happening with your projects today.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <HomeNavigation />
            <QuickActions />
            <RecentActivity activities={recentActivity} />
          </div>

          <div className="space-y-6">
            <UserStats stats={userStats} />
            <SystemStatus />
            <Announcements />
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error in HomePage:", error)

    // Fallback content for preview or when database is unavailable
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Welcome to Site Tracker!</h1>
          <p className="text-muted-foreground">Your project management dashboard.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <HomeNavigation />
            <QuickActions />
            <RecentActivity activities={[]} />
          </div>

          <div className="space-y-6">
            <UserStats
              stats={{
                totalTrackers: 0,
                activeTrackers: 0,
                completedTrackers: 0,
                totalSheets: 0,
              }}
            />
            <SystemStatus />
            <Announcements />
          </div>
        </div>
      </div>
    )
  }
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomeContent />
    </Suspense>
  )
}
