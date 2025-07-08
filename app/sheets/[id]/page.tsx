import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getSheetById, getSheetColumns, getSheetRows } from "@/lib/db"
import { ExcelSheet } from "@/components/excel-sheet"
import { ShareLinkDialog } from "@/components/share-link-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileSpreadsheet, Info, Calendar, User, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface SheetPageProps {
  params: {
    id: string
  }
}

export default async function SheetPage({ params }: SheetPageProps) {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  const sheet = await getSheetById(params.id, session.user.id)

  if (!sheet) {
    notFound()
  }

  const [columns, rows] = await Promise.all([getSheetColumns(params.id), getSheetRows(params.id)])

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6" />
              {sheet.name}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Owner: {sheet.owner_email}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Created: {new Date(sheet.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sheet.is_owner ? (
            <Badge variant="default">Owner</Badge>
          ) : (
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Public Access
            </Badge>
          )}
          <ShareLinkDialog sheetId={params.id} />
        </div>
      </div>

      {/* Access Info */}
      <Alert className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="font-semibold">Open to All Users</span>
          </div>
          <p className="mt-1">
            This sheet is publicly accessible. All authenticated users can view and edit this content.
            {sheet.is_owner && " As the owner, you can delete this sheet."}
          </p>
        </AlertDescription>
      </Alert>

      {/* Sheet Content */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Sheet Data</CardTitle>
          <CardDescription>
            {columns.length} columns • {rows.length} rows
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ExcelSheet
            sheetId={params.id}
            initialColumns={columns}
            initialRows={rows}
            canEdit={true}
            canManageColumns={true}
          />
        </CardContent>
      </Card>
    </div>
  )
}
