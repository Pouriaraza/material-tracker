import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Target, ClipboardList } from "lucide-react"

interface ActivityItem {
  id: string
  name: string
  created_at: string
  updated_at: string
}

interface RecentActivityProps {
  trackers: ActivityItem[]
  reserveItems: ActivityItem[]
}

export function RecentActivity({ trackers, reserveItems }: RecentActivityProps) {
  // Combine and sort all activity items by updated_at
  const allActivities = [...trackers, ...reserveItems]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)

  if (allActivities.length === 0) {
    return <div className="flex h-32 items-center justify-center text-muted-foreground">No recent activity found</div>
  }

  return (
    <div className="space-y-4">
      {allActivities.map((item) => {
        const isTracker = trackers.some((tracker) => tracker.id === item.id)
        const icon = isTracker ? <Target className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />
        const href = isTracker ? `/trackers/${item.id}` : "/reserve-tracker"
        const timeAgo = formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })

        return (
          <div
            key={`${isTracker ? "tracker" : "reserve"}-${item.id}`}
            className="flex items-center justify-between rounded-md border p-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">{icon}</div>
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {isTracker ? "Tracker" : "Reserve Item"} • Updated {timeAgo}
                </div>
              </div>
            </div>
            <Link href={href} className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
              View
            </Link>
          </div>
        )
      })}
    </div>
  )
}
