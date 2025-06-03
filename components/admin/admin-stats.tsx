import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileSpreadsheet, Target, ClipboardList } from "lucide-react"

export async function AdminStats() {
  const supabase = createClient()

  // Get user count
  const { count: userCount } = await supabase.auth.admin.listUsers({
    perPage: 1,
  })

  // Get sheet count
  const { count: sheetCount } = await supabase.from("sheets").select("*", { count: "exact", head: true })

  // Get tracker count
  const { count: trackerCount } = await supabase.from("trackers").select("*", { count: "exact", head: true })

  // Get reserve items count
  const { count: reserveItemsCount } = await supabase.from("reserve_items").select("*", { count: "exact", head: true })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{userCount || 0}</div>
          <p className="text-xs text-muted-foreground">Registered users in the system</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sheets</CardTitle>
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{sheetCount || 0}</div>
          <p className="text-xs text-muted-foreground">Sheets created by users</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Trackers</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{trackerCount || 0}</div>
          <p className="text-xs text-muted-foreground">Trackers created by users</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Reserve Items</CardTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{reserveItemsCount || 0}</div>
          <p className="text-xs text-muted-foreground">Items in reserve tracker</p>
        </CardContent>
      </Card>
    </div>
  )
}
