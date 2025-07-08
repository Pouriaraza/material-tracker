"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { UserPlus, Loader2, CheckCircle, XCircle, AlertCircle, Users, Mail, Shield } from "lucide-react"
import { toast } from "sonner"

interface BulkResult {
  email: string
  status: "success" | "error" | "exists"
  message: string
  user_id?: string
}

interface BulkResponse {
  success: boolean
  message: string
  results: {
    total: number
    successful: number
    failed: number
    details: BulkResult[]
  }
}

export function BulkUserManager() {
  const [emails, setEmails] = useState("")
  const [sendInvitations, setSendInvitations] = useState(true)
  const [makeAdmin, setMakeAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<BulkResponse | null>(null)

  // Pre-populate with the provided emails
  const prePopulateEmails = () => {
    const providedEmails = [
      "navid.es@mtnirancell.ir",
      "hamed.has@mtnirancell.ir",
      "rafiee.roji@gmail.com",
      "mohammadreza.khaz@mtnirancell.ir",
      "amirthr217@gmail.com",
      "rasammoghimi7@gmail.com",
      "ppejmanzad1@gmail.com",
      "pouria.raz@mtnirancell.ir",
      "parsaa.razavian@gmail.com",
      "pooria.pas1@gmail.com",
      "fallbeik@gmail.com",
      "tahafadafanh@gmail.com",
      "navid.esmaeli20@gmail.com",
    ]
    setEmails(providedEmails.join("\n"))
  }

  const parseEmails = (emailText: string): string[] => {
    return emailText
      .split(/[\n,;]+/)
      .map((email) => email.trim())
      .filter((email) => email.length > 0 && email.includes("@"))
  }

  const handleBulkAdd = async () => {
    const emailList = parseEmails(emails)

    if (emailList.length === 0) {
      toast.error("Please enter at least one valid email address")
      return
    }

    setLoading(true)
    setResults(null)

    try {
      const response = await fetch("/api/admin/bulk-add-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emails: emailList,
          send_invitations: sendInvitations,
          make_admin: makeAdmin,
        }),
      })

      const data: BulkResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to process users")
      }

      setResults(data)
      toast.success(data.message)
    } catch (error) {
      console.error("Error in bulk add users:", error)
      toast.error(error instanceof Error ? error.message : "Failed to process users")
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "exists":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="default" className="bg-green-500">
            Success
          </Badge>
        )
      case "error":
        return <Badge variant="destructive">Error</Badge>
      case "exists":
        return <Badge variant="secondary">Exists</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const emailList = parseEmails(emails)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Bulk User Management
        </CardTitle>
        <CardDescription>
          Add multiple users at once by email. Users will be created in the profiles table and optionally sent
          invitations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Action */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <h4 className="font-medium">Quick Start</h4>
            <p className="text-sm text-muted-foreground">Load the pre-configured user list</p>
          </div>
          <Button variant="outline" onClick={prePopulateEmails} disabled={loading}>
            Load 13 Users
          </Button>
        </div>

        {/* Email Input */}
        <div className="space-y-2">
          <Label htmlFor="emails">Email Addresses</Label>
          <Textarea
            id="emails"
            placeholder="Enter email addresses (one per line, or separated by commas/semicolons)&#10;example@domain.com&#10;user@company.com"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            rows={8}
            disabled={loading}
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{emailList.length} valid email(s) detected</span>
            <Button variant="ghost" size="sm" onClick={() => setEmails("")} disabled={loading}>
              Clear
            </Button>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="send-invitations"
              checked={sendInvitations}
              onCheckedChange={setSendInvitations}
              disabled={loading}
            />
            <Label htmlFor="send-invitations" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Send invitation emails to new users
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="make-admin" checked={makeAdmin} onCheckedChange={setMakeAdmin} disabled={loading} />
            <Label htmlFor="make-admin" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Make users admin (grants admin privileges)
            </Label>
          </div>
        </div>

        {/* Action Button */}
        <Button onClick={handleBulkAdd} disabled={loading || emailList.length === 0} className="w-full" size="lg">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing {emailList.length} users...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Add {emailList.length} User{emailList.length !== 1 ? "s" : ""}
            </>
          )}
        </Button>

        {/* Results */}
        {results && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Results</h4>
                <div className="flex gap-2">
                  <Badge variant="default">{results.results.successful} Success</Badge>
                  <Badge variant="destructive">{results.results.failed} Failed</Badge>
                  <Badge variant="outline">{results.results.total} Total</Badge>
                </div>
              </div>

              <ScrollArea className="h-64 border rounded-md p-4">
                <div className="space-y-2">
                  {results.results.details.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getStatusIcon(result.status)}
                        <span className="font-mono text-sm truncate">{result.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(result.status)}
                        <span className="text-xs text-muted-foreground max-w-48 truncate" title={result.message}>
                          {result.message}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
