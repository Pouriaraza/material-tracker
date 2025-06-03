"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Trash2, UserPlus } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"

interface SheetPermissionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sheetId: string
  sheetName: string
}

interface Permission {
  id: string
  user_id: string
  user_email: string
  role_id: string
  role_name: string
}

interface Role {
  id: string
  name: string
  description: string
}

export function SheetPermissionsDialog({ open, onOpenChange, sheetId, sheetName }: SheetPermissionsDialogProps) {
  const supabase = createClient()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserRole, setNewUserRole] = useState("")
  const [addingUser, setAddingUser] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Load permissions and roles when dialog opens
  useEffect(() => {
    if (open) {
      loadPermissions()
      loadRoles()
      getCurrentUser()
    }
  }, [open])

  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUser(user)
    } catch (err) {
      console.error("Error getting current user:", err)
    }
  }

  const loadPermissions = async () => {
    setLoading(true)
    setError(null)

    try {
      // Get permissions for this sheet
      const { data: permissionsData, error: permissionsError } = await supabase
        .from("sheet_permissions")
        .select(`
        id,
        user_id,
        role_id
      `)
        .eq("sheet_id", sheetId)

      if (permissionsError) {
        throw permissionsError
      }

      // If no permissions, return empty array
      if (!permissionsData || permissionsData.length === 0) {
        setPermissions([])
        return
      }

      // Get role information
      const roleIds = permissionsData.map((p) => p.role_id)
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("id, name")
        .in("id", roleIds)

      if (rolesError) {
        throw rolesError
      }

      // Create a map of role IDs to role names
      const roleMap = rolesData.reduce((map, role) => {
        map[role.id] = role.name
        return map
      }, {})

      // Get user information from auth.users
      const userIds = permissionsData.map((p) => p.user_id)

      // We need to get user emails from profiles table instead of auth.users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds)

      if (profilesError) {
        throw profilesError
      }

      // Create a map of user IDs to emails
      const userMap = profilesData.reduce((map, profile) => {
        map[profile.id] = profile.email
        return map
      }, {})

      // Format the permissions data
      const formattedPermissions = permissionsData.map((item) => ({
        id: item.id,
        user_id: item.user_id,
        user_email: userMap[item.user_id] || "Unknown user",
        role_id: item.role_id,
        role_name: roleMap[item.role_id] || "Unknown role",
      }))

      setPermissions(formattedPermissions)
    } catch (err: any) {
      console.error("Error loading permissions:", err)
      setError("Failed to load permissions: " + (err.message || "Unknown error"))
    } finally {
      setLoading(false)
    }
  }

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase.from("user_roles").select("*").order("name")

      if (error) {
        throw error
      }

      setRoles(data)

      // Set default role to viewer if available
      const viewerRole = data.find((role) => role.name.toLowerCase() === "viewer")
      if (viewerRole) {
        setNewUserRole(viewerRole.id)
      } else if (data.length > 0) {
        setNewUserRole(data[0].id)
      }
    } catch (err: any) {
      console.error("Error loading roles:", err)
      setError("Failed to load roles: " + (err.message || "Unknown error"))
    }
  }

  const handleAddUser = async () => {
    if (!newUserEmail.trim() || !newUserRole) {
      setError("Please enter an email address and select a role")
      return
    }

    setAddingUser(true)
    setError(null)

    try {
      // First, find the user by email in the profiles table
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", newUserEmail.trim())
        .single()

      if (userError) {
        throw new Error("User not found. Please check the email address.")
      }

      // Check if permission already exists
      const { data: existingPerm, error: existingError } = await supabase
        .from("sheet_permissions")
        .select("id")
        .eq("sheet_id", sheetId)
        .eq("user_id", userData.id)
        .maybeSingle()

      if (existingPerm) {
        // Update existing permission
        const { error: updateError } = await supabase
          .from("sheet_permissions")
          .update({ role_id: newUserRole })
          .eq("id", existingPerm.id)

        if (updateError) {
          throw updateError
        }
      } else {
        // Create new permission
        const { error: insertError } = await supabase.from("sheet_permissions").insert({
          sheet_id: sheetId,
          user_id: userData.id,
          role_id: newUserRole,
        })

        if (insertError) {
          throw insertError
        }
      }

      // Reload permissions
      await loadPermissions()

      // Reset form
      setNewUserEmail("")
    } catch (err: any) {
      console.error("Error adding user:", err)
      setError(err.message || "Failed to add user")
    } finally {
      setAddingUser(false)
    }
  }

  const handleRemovePermission = async (permissionId: string, userId: string) => {
    // Don't allow removing your own permission if you're the owner
    if (currentUser && userId === currentUser.id) {
      setError("You cannot remove your own permission")
      return
    }

    try {
      const { error } = await supabase.from("sheet_permissions").delete().eq("id", permissionId)

      if (error) {
        throw error
      }

      // Reload permissions
      await loadPermissions()
    } catch (err: any) {
      console.error("Error removing permission:", err)
      setError("Failed to remove permission: " + (err.message || "Unknown error"))
    }
  }

  const handleUpdateRole = async (permissionId: string, userId: string, newRoleId: string) => {
    try {
      const { error } = await supabase.from("sheet_permissions").update({ role_id: newRoleId }).eq("id", permissionId)

      if (error) {
        throw error
      }

      // Reload permissions
      await loadPermissions()
    } catch (err: any) {
      console.error("Error updating role:", err)
      setError("Failed to update role: " + (err.message || "Unknown error"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Access to "{sheetName}"</DialogTitle>
          <DialogDescription>Control who can access this sheet and what they can do with it.</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Add a user</h3>
            <div className="flex items-end gap-2">
              <div className="grid flex-1 gap-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  placeholder="user@example.com"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2 min-w-[120px]">
                <Label htmlFor="role">Role</Label>
                <Select value={newUserRole} onValueChange={setNewUserRole}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                size="icon"
                onClick={handleAddUser}
                disabled={addingUser || !newUserEmail || !newUserRole}
              >
                <UserPlus className="h-4 w-4" />
                <span className="sr-only">Add user</span>
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Current access</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading permissions...</p>
            ) : permissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users have been granted access yet.</p>
            ) : (
              <div className="space-y-2">
                {permissions.map((permission) => (
                  <div key={permission.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{permission.user_email}</span>
                      <Badge variant="outline" className="w-fit">
                        {permission.role_name}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={permission.role_id}
                        onValueChange={(value) => handleUpdateRole(permission.id, permission.user_id, value)}
                      >
                        <SelectTrigger className="h-8 w-[100px]">
                          <SelectValue placeholder="Change role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleRemovePermission(permission.id, permission.user_id)}
                        disabled={currentUser && permission.user_id === currentUser.id}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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

// Make sure to export the component as default as well
export default SheetPermissionsDialog
