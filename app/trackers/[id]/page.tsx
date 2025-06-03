import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/server"
import { getTrackerById } from "@/lib/db-trackers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Edit, Plus } from "lucide-react"
import { TrackerCharts } from "@/components/tracker-charts"

export default async function TrackerPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  const tracker = await getTrackerById(params.id, session.user.id)

  if (!tracker) {
    notFound()
  }

  // Sort logs by date (newest first)
  const sortedLogs = [...tracker.logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href="/trackers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">{tracker.title}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tracker.description && <p className="text-muted-foreground">{tracker.description}</p>}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Progress</span>
                  <span className="font-medium">
                    {tracker.progress} / {tracker.target} {tracker.unit}
                  </span>
                </div>
                <Progress value={(tracker.progress / tracker.target) * 100} className="h-3" />
                <div className="text-right text-sm text-muted-foreground">
                  {Math.round((tracker.progress / tracker.target) * 100)}% complete
                </div>
              </div>
              <div className="pt-2 flex flex-col gap-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="capitalize">{tracker.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started:</span>
                  <span>{format(new Date(tracker.startDate), "PPP")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{format(new Date(tracker.createdAt), "PPP")}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button asChild className="flex-1">
              <Link href={`/trackers/${tracker.id}/log`}>
                <Plus className="mr-2 h-4 w-4" /> Log Progress
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/trackers/${tracker.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" /> Edit Tracker
              </Link>
            </Button>
          </div>

          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="text-sm text-muted-foreground">Total Entries</div>
                    <div className="text-2xl font-bold">{tracker.logs.length}</div>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="text-sm text-muted-foreground">Average Per Entry</div>
                    <div className="text-2xl font-bold">
                      {tracker.logs.length > 0
                        ? (tracker.logs.reduce((sum, log) => sum + log.amount, 0) / tracker.logs.length).toFixed(1)
                        : "0"}{" "}
                      {tracker.unit}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="chart" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="logs">History</TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="pt-6">
          {tracker.logs.length > 0 ? (
            <div className="h-[400px] w-full">
              <TrackerCharts tracker={tracker} />
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No progress has been logged yet</p>
              <Button asChild className="mt-4">
                <Link href={`/trackers/${tracker.id}/log`}>
                  <Plus className="mr-2 h-4 w-4" /> Log First Entry
                </Link>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="pt-6">
          {sortedLogs.length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{format(new Date(log.date), "yyyy/MM/dd HH:mm")}</TableCell>
                      <TableCell>
                        {log.amount} {tracker.unit}
                      </TableCell>
                      <TableCell>{log.note || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No progress has been logged yet</p>
              <Button asChild className="mt-4">
                <Link href={`/trackers/${tracker.id}/log`}>
                  <Plus className="mr-2 h-4 w-4" /> Log First Entry
                </Link>
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
