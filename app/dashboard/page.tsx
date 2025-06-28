import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getSheets } from "@/lib/db"
import { getUserTrackers } from "@/lib/db-trackers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, FileSpreadsheet, Target, AlertTriangle, ClipboardList, FileText, Package } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DeleteSheetButton } from "@/components/delete-sheet-button"
import { checkIsAdmin } from "@/lib/auth-utils"
import { Suspense } from "react"
import { HomeNavigation } from "@/components/home/home-navigation"
import { QuickActions } from "@/components/home/quick-actions"
import { UserStats } from "@/components/home/user-stats"
import { RecentActivity } from "@/components/home/recent-activity"
import { SystemStatus } from "@/components/home/system-status"

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-gray-200 rounded"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Check if user is admin
  const isAdmin = await checkIsAdmin()

  // Fetch data with error handling
  let sheets = []
  let trackers = []
  let sheetsError = null
  let trackersError = null

  try {
    sheets = await getSheets(session.user.id)
  } catch (error) {
    console.error("Error fetching sheets:", error)
    sheetsError = "Failed to load sheets. Please try again later."
  }

  try {
    trackers = await getUserTrackers(session.user.id)
  } catch (error) {
    console.error("Error fetching trackers:", error)
    trackersError = "Failed to load trackers. Please try again later."
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your projects and activities</p>
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <HomeNavigation />
            <QuickActions />
            <RecentActivity />
          </div>
          <div className="space-y-8">
            <UserStats />
            <SystemStatus />
          </div>
        </div>
      </Suspense>

      <Tabs defaultValue="sheets" className="w-full mt-8">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-6 sm:mb-8 h-auto">
          <TabsTrigger value="sheets" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="text-xs sm:text-sm">Sheets</span>
          </TabsTrigger>
          <TabsTrigger value="trackers" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3">
            <Target className="h-4 w-4" />
            <span className="text-xs sm:text-sm">Trackers</span>
          </TabsTrigger>
          <TabsTrigger value="reserve" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3">
            <ClipboardList className="h-4 w-4" />
            <span className="text-xs sm:text-sm hidden sm:inline">Reserve</span>
            <span className="text-xs sm:hidden">Reserve</span>
          </TabsTrigger>
          <TabsTrigger value="settlement" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3">
            <FileText className="h-4 w-4" />
            <span className="text-xs sm:text-sm hidden sm:inline">Settlement</span>
            <span className="text-xs sm:hidden">Settlement</span>
          </TabsTrigger>
          <TabsTrigger value="material" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3">
            <Package className="h-4 w-4" />
            <span className="text-xs sm:text-sm">Material</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sheets">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold">Your Sheets</h2>
            <Button asChild size="sm" className="w-full sm:w-auto">
              <Link href="/sheets/new">
                <Plus className="mr-2 h-4 w-4" />
                <span className="sm:hidden">New Sheet</span>
                <span className="hidden sm:inline">Create New Sheet</span>
              </Link>
            </Button>
          </div>

          {sheetsError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{sheetsError}</AlertDescription>
            </Alert>
          ) : sheets.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <FileSpreadsheet className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
              <h2 className="mt-4 text-lg sm:text-xl font-semibold">No sheets found</h2>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground px-4">
                Create your first sheet to get started tracking your data.
              </p>
              <Button className="mt-4 sm:mt-6 w-full sm:w-auto" asChild>
                <Link href="/sheets/new">
                  <Plus className="mr-2 h-4 w-4" /> Create New Sheet
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {sheets.map((sheet) => (
                <Card key={sheet.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base sm:text-lg truncate">{sheet.name}</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          Created {new Date(sheet.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <DeleteSheetButton sheetId={sheet.id} sheetName={sheet.name} variant="ghost" size="sm" />
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Last updated {new Date(sheet.updated_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full" size="sm">
                      <Link href={`/sheets/${sheet.id}`}>Open Sheet</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trackers">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold">Your Trackers</h2>
            <Button asChild size="sm" className="w-full sm:w-auto">
              <Link href="/trackers/new">
                <Plus className="mr-2 h-4 w-4" />
                <span className="sm:hidden">New Tracker</span>
                <span className="hidden sm:inline">Create New Tracker</span>
              </Link>
            </Button>
          </div>

          {trackersError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{trackersError}</AlertDescription>
            </Alert>
          ) : trackers.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Target className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
              <h2 className="mt-4 text-lg sm:text-xl font-semibold">No trackers found</h2>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground px-4">
                Create your first tracker to start monitoring your progress.
              </p>
              <Button className="mt-4 sm:mt-6 w-full sm:w-auto" asChild>
                <Link href="/trackers/new">
                  <Plus className="mr-2 h-4 w-4" /> Create New Tracker
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {trackers.map((tracker) => (
                <Card key={tracker.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg truncate">{tracker.title}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      {tracker.type === "habit" ? "Habit" : "Goal"} • Started{" "}
                      {new Date(tracker.startDate).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span>Progress</span>
                        <span>
                          {tracker.progress} / {tracker.target} {tracker.unit}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 sm:h-2.5">
                        <div
                          className="bg-primary h-2 sm:h-2.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (tracker.progress / tracker.target) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full" size="sm">
                      <Link href={`/trackers/${tracker.id}`}>View Details</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reserve">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold">Reserve Tracker</h2>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-purple-600 text-white hover:bg-purple-700 border-purple-600 w-full sm:w-auto"
                  asChild
                >
                  <Link href="/reserve-tracker/permissions">
                    <FileText className="mr-2 h-4 w-4" />
                    <span className="sm:hidden">Permissions</span>
                    <span className="hidden sm:inline">Manage Permissions</span>
                  </Link>
                </Button>
              )}
              <Button asChild size="sm" className="w-full sm:w-auto">
                <Link href="/reserve-tracker">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  <span className="sm:hidden">Open</span>
                  <span className="hidden sm:inline">Open Full View</span>
                </Link>
              </Button>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
              <CardTitle className="text-lg sm:text-xl">MR Number Tracking</CardTitle>
              <CardDescription className="text-sm sm:text-base">Track your MR numbers and their status</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="text-center py-6 sm:py-8">
                <ClipboardList className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
                <h3 className="mt-4 text-base sm:text-lg font-semibold">Reserve Tracker</h3>
                <p className="mt-2 text-sm sm:text-base text-muted-foreground px-4">
                  Track MR numbers with a simple checkbox interface
                </p>
                <Button className="mt-4 sm:mt-6 w-full sm:w-auto" asChild>
                  <Link href="/reserve-tracker">
                    <ClipboardList className="mr-2 h-4 w-4" /> Open Reserve Tracker
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settlement">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold">Settlement Tracker</h2>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-purple-600 text-white hover:bg-purple-700 border-purple-600 w-full sm:w-auto"
                  asChild
                >
                  <Link href="/settlement-tracker/permissions">
                    <FileText className="mr-2 h-4 w-4" />
                    <span className="sm:hidden">Permissions</span>
                    <span className="hidden sm:inline">Manage Permissions</span>
                  </Link>
                </Button>
              )}
              <Button asChild size="sm" className="w-full sm:w-auto">
                <Link href="/settlement-tracker">
                  <FileText className="mr-2 h-4 w-4" />
                  <span className="sm:hidden">Open</span>
                  <span className="hidden sm:inline">Open Full View</span>
                </Link>
              </Button>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950">
              <CardTitle className="text-lg sm:text-xl">Settlement Tracking</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Track your settlements and their status
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="text-center py-6 sm:py-8">
                <FileText className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
                <h3 className="mt-4 text-base sm:text-lg font-semibold">Settlement Tracker</h3>
                <p className="mt-2 text-sm sm:text-base text-muted-foreground px-4">
                  Track settlements with a comprehensive interface
                </p>
                <Button className="mt-4 sm:mt-6 w-full sm:w-auto" asChild>
                  <Link href="/settlement-tracker">
                    <FileText className="mr-2 h-4 w-4" /> Open Settlement Tracker
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="material">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold">Material Management</h2>
            <Button asChild size="sm" className="w-full sm:w-auto">
              <Link href="/material">
                <Package className="mr-2 h-4 w-4" />
                <span className="sm:hidden">Open</span>
                <span className="hidden sm:inline">Go to Material Management</span>
              </Link>
            </Button>
          </div>

          <Card className="mb-6">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
              <CardTitle className="text-lg sm:text-xl flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Material Management System
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Manage materials for different brands (Ericsson, Huawei, and custom brands)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="text-center py-6 sm:py-8">
                <Package className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-purple-600" />
                <h3 className="mt-4 text-base sm:text-lg font-semibold">Material Management</h3>
                <p className="mt-2 text-sm sm:text-base text-muted-foreground px-4">
                  Manage materials for Ericsson, Huawei, and create custom brands
                </p>
                <Button className="mt-4 sm:mt-6 bg-purple-600 hover:bg-purple-700 w-full sm:w-auto" asChild>
                  <Link href="/material">
                    <Package className="mr-2 h-4 w-4" /> Open Material Management
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
