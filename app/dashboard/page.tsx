import { CardFooter } from "@/components/ui/card"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getSheets } from "@/lib/db"
import { getUserTrackers } from "@/lib/db-trackers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  FileSpreadsheet,
  Target,
  AlertTriangle,
  ClipboardList,
  FileText,
  Package,
  Users,
  Calendar,
  User,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { checkIsAdmin } from "@/lib/auth-utils"
import Link from "next/link"

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
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Manage your spreadsheets and data</p>
        </div>
        <Button asChild>
          <Link href="/sheets/new">
            <Plus className="h-4 w-4 mr-2" />
            New Sheet
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="sheets" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8">
          <TabsTrigger value="sheets">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Sheets
          </TabsTrigger>
          <TabsTrigger value="trackers">
            <Target className="mr-2 h-4 w-4" /> Trackers
          </TabsTrigger>
          <TabsTrigger value="reserve">
            <ClipboardList className="mr-2 h-4 w-4" /> Reserve Tracker
          </TabsTrigger>
          <TabsTrigger value="settlement">
            <FileText className="mr-2 h-4 w-4" /> Settlement Tracker
          </TabsTrigger>
          <TabsTrigger value="material">
            <Package className="mr-2 h-4 w-4" /> Material
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sheets">
          {/* Sheets Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sheets.map((sheet) => (
              <Card key={sheet.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg line-clamp-1">{sheet.name}</CardTitle>
                    </div>
                    {sheet.is_owner ? (
                      <Badge variant="default" className="text-xs">
                        Owner
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                        Public
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>Created by: {sheet.owner_email}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Created: {new Date(sheet.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Users className="h-3 w-3" />
                    <span>Open to all users</span>
                  </div>

                  <div className="pt-2">
                    <Button asChild className="w-full bg-transparent" variant="outline">
                      <Link href={`/sheets/${sheet.id}`}>Open Sheet</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {sheetsError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{sheetsError}</AlertDescription>
            </Alert>
          ) : sheets.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <CardTitle className="mb-2">No sheets yet</CardTitle>
                <CardDescription className="mb-4">Create your first spreadsheet to get started</CardDescription>
                <Button asChild>
                  <Link href="/sheets/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Sheet
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-8 text-center text-sm text-muted-foreground">
              <p>
                Showing {sheets.length} sheet{sheets.length !== 1 ? "s" : ""} • All sheets are publicly accessible
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="trackers">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Your Trackers</h2>
            <Button asChild>
              <Link href="/trackers/new">
                <Plus className="mr-2 h-4 w-4" /> Create New Tracker
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
            <div className="text-center py-12">
              <Target className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="mt-4 text-xl font-semibold">No trackers found</h2>
              <p className="mt-2 text-muted-foreground">Create your first tracker to start monitoring your progress.</p>
              <Button className="mt-6" asChild>
                <Link href="/trackers/new">
                  <Plus className="mr-2 h-4 w-4" /> Create New Tracker
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {trackers.map((tracker) => (
                <Card key={tracker.id}>
                  <CardHeader>
                    <CardTitle>{tracker.title}</CardTitle>
                    <CardDescription>
                      {tracker.type === "habit" ? "Habit" : "Goal"} • Started{" "}
                      {new Date(tracker.startDate).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>
                          {tracker.progress} / {tracker.target} {tracker.unit}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div
                          className="bg-primary h-2.5 rounded-full"
                          style={{ width: `${Math.min(100, (tracker.progress / tracker.target) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full">
                      <Link href={`/trackers/${tracker.id}`}>View Details</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reserve">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Reserve Tracker</h2>
            <div className="flex gap-2">
              {isAdmin && (
                <Button
                  variant="outline"
                  className="bg-purple-600 text-white hover:bg-purple-700 border-purple-600"
                  asChild
                >
                  <Link href="/reserve-tracker/permissions">
                    <FileText className="mr-2 h-4 w-4" /> Manage Permissions
                  </Link>
                </Button>
              )}
              <Button asChild>
                <Link href="/reserve-tracker">
                  <ClipboardList className="mr-2 h-4 w-4" /> Open Full View
                </Link>
              </Button>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
              <CardTitle className="text-xl">MR Number Tracking</CardTitle>
              <CardDescription>Track your MR numbers and their status</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Reserve Tracker</h3>
                <p className="mt-2 text-muted-foreground">Track MR numbers with a simple checkbox interface</p>
                <Button className="mt-6" asChild>
                  <Link href="/reserve-tracker">
                    <ClipboardList className="mr-2 h-4 w-4" /> Open Reserve Tracker
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settlement">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Settlement Tracker</h2>
            <div className="flex gap-2">
              {isAdmin && (
                <Button
                  variant="outline"
                  className="bg-purple-600 text-white hover:bg-purple-700 border-purple-600"
                  asChild
                >
                  <Link href="/settlement-tracker/permissions">
                    <FileText className="mr-2 h-4 w-4" /> Manage Permissions
                  </Link>
                </Button>
              )}
              <Button asChild>
                <Link href="/settlement-tracker">
                  <FileText className="mr-2 h-4 w-4" /> Open Full View
                </Link>
              </Button>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950">
              <CardTitle className="text-xl">Settlement Tracking</CardTitle>
              <CardDescription>Track your settlements and their status</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Settlement Tracker</h3>
                <p className="mt-2 text-muted-foreground">Track settlements with a comprehensive interface</p>
                <Button className="mt-6" asChild>
                  <Link href="/settlement-tracker">
                    <FileText className="mr-2 h-4 w-4" /> Open Settlement Tracker
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="material">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Material Management</h2>
            <Button asChild>
              <Link href="/material">
                <Package className="mr-2 h-4 w-4" /> Go to Material Management
              </Link>
            </Button>
          </div>

          <Card className="mb-6">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
              <CardTitle className="text-xl flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Material Management System
              </CardTitle>
              <CardDescription>
                Manage materials for different brands (Ericsson, Huawei, and custom brands)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-purple-600" />
                <h3 className="mt-4 text-lg font-semibold">Material Management</h3>
                <p className="mt-2 text-muted-foreground">
                  Manage materials for Ericsson, Huawei, and create custom brands
                </p>
                <Button className="mt-6 bg-purple-600 hover:bg-purple-700" asChild>
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
