"use client"

import { DialogDescription } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Trash2, UserPlus } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

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

export function ReserveTrackerPermissions() {
  const supabase = createClient()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserRole, setNewUserRole] = useState("")
  const [addingUser, setAddingUser] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    loadPermissions()
    loadRoles()
  }, [])

  const loadPermissions = async () => {
    setLoading(true)
    setError(null)

    try {
      // Get permissions for this sheet
      const { data: permissionsData, error: permissionsError } = await supabase.from("reserve_permissions").select(`
        id,
        user_id,
        role_id
      `)

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
        .from("reserve_permissions")
        .select("id")
        .eq("user_id", userData.id)
        .maybeSingle()

      if (existingPerm) {
        // Update existing permission
        const { error: updateError } = await supabase
          .from("reserve_permissions")
          .update({ role_id: newUserRole })
          .eq("id", existingPerm.id)

        if (updateError) {
          throw updateError
        }
      } else {
        // Create new permission
        const { error: insertError } = await supabase.from("reserve_permissions").insert({
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

  const handleRemovePermission = async (permissionId: string) => {
    try {
      const { error } = await supabase.from("reserve_permissions").delete().eq("id", permissionId)

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

  const handleUpdateRole = async (permissionId: string, newRoleId: string) => {
    try {
      const { error } = await supabase.from("reserve_permissions").update({ role_id: newRoleId }).eq("id", permissionId)

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
    <div>
      <Button onClick={() => setOpen(true)}>Manage Permissions</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Access to Reserve Tracker</DialogTitle>
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissions.map((permission) => (
                        <TableRow key={permission.id}>
                          <TableCell>{permission.user_id}</TableCell>
                          <TableCell>{permission.user_email}</TableCell>
                          <TableCell>
                            <Select
                              value={permission.role_id}
                              onValueChange={(value) => handleUpdateRole(permission.id, value)}
                            >
                              <SelectTrigger className="w-[180px]">
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
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleRemovePermission(permission.id)}>
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
