"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Target, Repeat, AlertTriangle } from "lucide-react"
import { TrackerList } from "@/components/tracker-list-server"
import { TrackerStats } from "@/components/tracker-stats"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Tracker } from "@/types/tracker"

interface TrackersClientProps {
  trackers: Tracker[]
  error: string | null
}

export function TrackersClient({ trackers, error }: TrackersClientProps) {
  const habitTrackers = trackers.filter((tracker) => tracker.type === "habit")
  const goalTrackers = trackers.filter((tracker) => tracker.type === "goal")

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Trackers</h1>
        <Button asChild>
          <Link href="/trackers/new">
            <Plus className="mr-2 h-4 w-4" /> Create New Tracker
          </Link>
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive" className="mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : trackers.length > 0 ? (
        <div className="mb-8">
          <TrackerStats trackers={trackers} />
        </div>
      ) : null}

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="all">All Trackers</TabsTrigger>
          <TabsTrigger value="habits">
            <Repeat className="mr-2 h-4 w-4" /> Habits
          </TabsTrigger>
          <TabsTrigger value="goals">
            <Target className="mr-2 h-4 w-4" /> Goals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {error ? (
            <Card>
              <CardHeader>
                <CardTitle>Error Loading Trackers</CardTitle>
                <CardDescription>We encountered an issue while loading your trackers.</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button onClick={() => window.location.reload()}>Try Again</Button>
              </CardFooter>
            </Card>
          ) : trackers.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No trackers yet</CardTitle>
                <CardDescription>Create your first tracker to start tracking your progress</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild>
                  <Link href="/trackers/new">
                    <Plus className="mr-2 h-4 w-4" /> Create New Tracker
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <TrackerList trackers={trackers} />
          )}
        </TabsContent>

        <TabsContent value="habits">
          {error ? (
            <Card>
              <CardHeader>
                <CardTitle>Error Loading Habits</CardTitle>
                <CardDescription>We encountered an issue while loading your habit trackers.</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button onClick={() => window.location.reload()}>Try Again</Button>
              </CardFooter>
            </Card>
          ) : habitTrackers.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No habits yet</CardTitle>
                <CardDescription>Create your first habit tracker</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild>
                  <Link href="/trackers/new?type=habit">
                    <Plus className="mr-2 h-4 w-4" /> Create New Habit
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <TrackerList trackers={habitTrackers} />
          )}
        </TabsContent>

        <TabsContent value="goals">
          {error ? (
            <Card>
              <CardHeader>
                <CardTitle>Error Loading Goals</CardTitle>
                <CardDescription>We encountered an issue while loading your goal trackers.</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button onClick={() => window.location.reload()}>Try Again</Button>
              </CardFooter>
            </Card>
          ) : goalTrackers.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No goals yet</CardTitle>
                <CardDescription>Create your first goal tracker</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild>
                  <Link href="/trackers/new?type=goal">
                    <Plus className="mr-2 h-4 w-4" /> Create New Goal
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <TrackerList trackers={goalTrackers} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
