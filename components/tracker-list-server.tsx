"use client"

import Link from "next/link"
import { format } from "date-fns"
import { Edit, BarChart, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { Tracker } from "@/types/tracker"

interface TrackerListProps {
  trackers: Tracker[]
}

export function TrackerList({ trackers }: TrackerListProps) {
  if (trackers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No trackers found in this category</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {trackers.map((tracker) => (
        <Card key={tracker.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle>{tracker.title}</CardTitle>
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/trackers/${tracker.id}/edit`}>
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tracker.description && <p className="text-sm text-muted-foreground">{tracker.description}</p>}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>
                    {tracker.progress} / {tracker.target} {tracker.unit}
                  </span>
                </div>
                <Progress value={(tracker.progress / tracker.target) * 100} className="h-2" />
              </div>
              <div className="text-xs text-muted-foreground">Started: {format(new Date(tracker.startDate), "PPP")}</div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/trackers/${tracker.id}`}>
                <BarChart className="h-4 w-4 mr-2" />
                History
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/trackers/${tracker.id}/log`}>
                <Plus className="h-4 w-4 mr-2" />
                Log Progress
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
