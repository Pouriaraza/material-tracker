"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Trash2, Users, Plus, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Permission {
  id: string
  user_id: string
  permission_type: string
  user_email?: string
  user_name?: string
  created_at: string
}

interface SheetPermissionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sheetId: string
  sheetName: string
}

export default function SheetPermissionsDialog({
  open,
  onOpenChange,
  sheetId,
  sheetName,
}: SheetPermissionsDialogProps) {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [setupNeeded, setSetupNeeded] = useState(false)
  const [settingUp, setSettingUp] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newPermissionType, setNewPermissionType] = useState("read")
  const supabase = createClient()

  const setupTable = async () => {
    setSettingUp(true)
    try {
      const response = await fetch("/api/setup-sheet-permissions", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to setup table")
      }

      toast.success("Sheet permissions table created successfully")
      setSetupNeeded(false)
      await fetchPermissions()
    } catch (error) {
      console.error("Error setting up table:", error)
      toast.error("Failed to setup permissions table")
    } finally {
      setSettingUp(false)
    }
  }

  const fetchPermissions = async () => {
    if (!open) return

    setLoading(true)
    try {
      // Get sheet permissions with user details
      const { data: permissionsData, error: permissionsError } = await supabase
        .from("sheet_permissions")
        .select(`
          id,
          user_id,
          permission_type,
          created_at
        `)
        .eq("sheet_id", sheetId)

      if (permissionsError) {
        console.error("Error fetching permissions:", permissionsError)

        // If table doesn't exist, show setup needed
        if (permissionsError.code === "42P01" || permissionsError.message?.includes("does not exist")) {
          setSetupNeeded(true)
          setPermissions([])
          return
        }

        toast.error("Failed to load permissions")
        return
      }

      // Get user details for each permission
      const permissionsWithUsers = []
      for (const permission of permissionsData || []) {
        try {
          // Try to get user from profiles first
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", permission.user_id)
            .single()

          if (!profileError && profileData) {
            permissionsWithUsers.push({
              ...permission,
              user_email: profileData.email,
              user_name: profileData.full_name,
            })
          } else {
            // Fallback: show unknown user
            permissionsWithUsers.push({
              ...permission,
              user_email: "Unknown User",
              user_name: null,
            })
          }
        } catch (error) {
          console.error("Error loading user data:", error)
          permissionsWithUsers.push({
            ...permission,
            user_email: "Unknown User",
            user_name: null,
          })
        }
      }

      setPermissions(permissionsWithUsers)
      setSetupNeeded(false)
    } catch (error) {
      console.error("Error in fetchPermissions:", error)
      toast.error("Failed to load permissions")
    } finally {
      setLoading(false)
    }
  }

  const addPermission = async () => {
    if (!newUserEmail.trim()) {
      toast.error("Please enter a user email")
      return
    }

    setAdding(true)
    try {
      // First, find the user by email
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("email", newUserEmail.trim())
        .single()

      if (userError || !userData) {
        toast.error("User not found. Please make sure the email is correct and the user has an account.")
        return
      }

      // Check if user already has permission
      const existingPermission = permissions.find((p) => p.user_id === userData.id)
      if (existingPermission) {
        toast.error("User already has permission for this sheet")
        return
      }

      // Add permission
      const { error: insertError } = await supabase.from("sheet_permissions").insert({
        sheet_id: sheetId,
        user_id: userData.id,
        permission_type: newPermissionType,
      })

      if (insertError) {
        console.error("Error adding permission:", insertError)
        toast.error("Failed to add user permission")
        return
      }

      toast.success("User added successfully")

      setNewUserEmail("")
      setNewPermissionType("read")
      await fetchPermissions()
    } catch (error) {
      console.error("Error in addPermission:", error)
      toast.error("Failed to add user")
    } finally {
      setAdding(false)
    }
  }

  const removePermission = async (permissionId: string) => {
    try {
      const { error } = await supabase.from("sheet_permissions").delete().eq("id", permissionId)

      if (error) {
        console.error("Error removing permission:", error)
        toast.error("Failed to remove user")
        return
      }

      toast.success("User removed successfully")
      await fetchPermissions()
    } catch (error) {
      console.error("Error in removePermission:", error)
      toast.error("Failed to remove user")
    }
  }

  const updatePermission = async (permissionId: string, newType: string) => {
    try {
      const { error } = await supabase
        .from("sheet_permissions")
        .update({ permission_type: newType, updated_at: new Date().toISOString() })
        .eq("id", permissionId)

      if (error) {
        console.error("Error updating permission:", error)
        toast.error("Failed to update permission")
        return
      }

      toast.success("Permission updated successfully")
      await fetchPermissions()
    } catch (error) {
      console.error("Error in updatePermission:", error)
      toast.error("Failed to update permission")
    }
  }

  useEffect(() => {
    if (open) {
      fetchPermissions()
    }
  }, [open])

  const getPermissionBadgeVariant = (type: string) => {
    switch (type) {
      case "admin":
        return "destructive" as const
      case "write":
        return "default" as const
      case "read":
        return "secondary" as const
      default:
        return "outline" as const
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sheet Permissions - {sheetName}
          </DialogTitle>
          <DialogDescription>Manage who can access this sheet and their permission levels.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Setup Alert */}
          {setupNeeded && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The permissions system needs to be set up for this sheet.
                <Button onClick={setupTable} disabled={settingUp} className="ml-2" size="sm">
                  {settingUp ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    "Setup Now"
                  )}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Add New User */}
          {!setupNeeded && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New User
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="email">User Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    disabled={adding}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addPermission()
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="permission">Permission</Label>
                  <Select value={newPermissionType} onValueChange={setNewPermissionType} disabled={adding}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read">Read Only</SelectItem>
                      <SelectItem value="write">Read & Write</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={addPermission} disabled={adding} className="w-full">
                {adding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding User...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add User
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Current Permissions */}
          {!setupNeeded && (
            <div className="space-y-4">
              <h4 className="font-medium">Current Users ({permissions.length})</h4>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading permissions...</span>
                </div>
              ) : permissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users have been granted access to this sheet yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {permissions.map((permission) => (
                    <div key={permission.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{permission.user_email || "Unknown User"}</div>
                        {permission.user_name && (
                          <div className="text-sm text-muted-foreground">{permission.user_name}</div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Added {new Date(permission.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={permission.permission_type}
                          onValueChange={(value) => updatePermission(permission.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="read">Read Only</SelectItem>
                            <SelectItem value="write">Read & Write</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>

                        <Badge variant={getPermissionBadgeVariant(permission.permission_type)}>
                          {permission.permission_type}
                        </Badge>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePermission(permission.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
