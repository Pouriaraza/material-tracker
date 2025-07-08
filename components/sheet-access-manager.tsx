"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Info, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SheetAccessManagerProps {
  sheetId: string
  isOwner: boolean
}

export function SheetAccessManager({ sheetId, isOwner }: SheetAccessManagerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          Access Info
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sheet Access Information
          </DialogTitle>
          <DialogDescription>
            This sheet uses an open access system where all authenticated users have access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Open Access Info */}
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <div className="font-semibold mb-1">Open Access System Active</div>
              <p>All authenticated users can view and edit this sheet. No permission management is required.</p>
            </AlertDescription>
          </Alert>

          {/* Access Levels */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Access Levels</CardTitle>
              <CardDescription>How different users can interact with this sheet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">All Authenticated Users</div>
                  <div className="text-sm text-muted-foreground">Anyone logged into the system</div>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                >
                  Full Edit Access
                </Badge>
              </div>

              {isOwner && (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 dark:bg-blue-950">
                  <div>
                    <div className="font-medium">You (Sheet Owner)</div>
                    <div className="text-sm text-muted-foreground">Additional privileges as the creator</div>
                  </div>
                  <Badge variant="default">Owner + Delete Rights</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* What Users Can Do */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What Users Can Do</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-green-700 dark:text-green-300">✅ Everyone Can:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• View all sheet content</li>
                    <li>• Edit cell values</li>
                    <li>• Add new rows</li>
                    <li>• Delete rows</li>
                    <li>• Add new columns</li>
                    <li>• Modify column properties</li>
                    <li>• Update sheet name</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-700 dark:text-blue-300">👑 Owner Only:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Delete the entire sheet</li>
                    <li>• View ownership information</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Note */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> This open access system means no permission management is needed. All changes are
              immediately visible to all users. Consider this when working with sensitive data.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  )
}
