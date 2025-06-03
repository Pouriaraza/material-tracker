import { Target, ClipboardList, Users } from "lucide-react"

interface UserStatsProps {
  stats: {
    userCount: number
    trackerCount: number
    reserveItemCount: number
  }
}

export function UserStats({ stats }: UserStatsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Target className="h-4 w-4" />
          </div>
          <span className="text-sm">Trackers</span>
        </div>
        <span className="font-medium">{stats.trackerCount}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <ClipboardList className="h-4 w-4" />
          </div>
          <span className="text-sm">Reserve Items</span>
        </div>
        <span className="font-medium">{stats.reserveItemCount}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-4 w-4" />
          </div>
          <span className="text-sm">Users</span>
        </div>
        <span className="font-medium">{stats.userCount}</span>
      </div>
    </div>
  )
}
