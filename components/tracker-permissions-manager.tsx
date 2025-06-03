"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Trash2, UserPlus } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

interface UserPermission {
  id: string
  user_id: string
  user_email: string
  can_view: boolean
  can_edit: boolean
  can_delete: boolean
  can_manage: boolean
}

export default function TrackerPermissionsManager({
  trackerType,
  trackerName,
}: {
  trackerType: "reserve" | "settlement"
  trackerName: string
}) {
  const supabase = createClient()
  const [permissions, setPermissions] = useState<UserPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [addingUser, setAddingUser] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Table name based on tracker type
  const permissionsTable = `${trackerType}_permissions`

  useEffect(() => {
    loadPermissions()
  }, [])

  const loadPermissions = async () => {
    setLoading(true)
    setError(null)

    try {
      // Get permissions for this tracker
      const { data: permissionsData, error: permissionsError } = await supabase.from(permissionsTable).select("*")

      if (permissionsError) {
        throw permissionsError
      }

      // If no permissions, return empty array
      if (!permissionsData || permissionsData.length === 0) {
        setPermissions([])
        setLoading(false)
        return
      }

      // Get user information from profiles table
      const userIds = permissionsData.map((p) => p.user_id)
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
        can_view: item.can_view,
        can_edit: item.can_edit,
        can_delete: item.can_delete,
        can_manage: item.can_manage,
      }))

      setPermissions(formattedPermissions)
    } catch (err: any) {
      console.error(`Error loading ${trackerType} permissions:`, err)
      setError(`Failed to load permissions: ${err.message || "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) {
      setError("Please enter an email address")
      return
    }

    setAddingUser(true)
    setError(null)
    setSuccessMessage(null)

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
        .from(permissionsTable)
        .select("id")
        .eq("user_id", userData.id)
        .maybeSingle()

      if (existingPerm) {
        throw new Error("This user already has permissions for this tracker.")
      }

      // Create new permission with default values
      const { error: insertError } = await supabase.from(permissionsTable).insert({
        user_id: userData.id,
        can_view: true,
        can_edit: false,
        can_delete: false,
        can_manage: false,
      })

      if (insertError) {
        throw insertError
      }

      // Reload permissions
      await loadPermissions()
      setSuccessMessage(`User ${newUserEmail} added successfully`)

      // Reset form
      setNewUserEmail("")
    } catch (err: any) {
      console.error(`Error adding user to ${trackerType}:`, err)
      setError(err.message || "Failed to add user")
    } finally {
      setAddingUser(false)
    }
  }

  const handleRemovePermission = async (permissionId: string) => {
    try {
      setSuccessMessage(null)
      const { error } = await supabase.from(permissionsTable).delete().eq("id", permissionId)

      if (error) {
        throw error
      }

      // Reload permissions
      await loadPermissions()
      setSuccessMessage("User removed successfully")
    } catch (err: any) {
      console.error(`Error removing permission from ${trackerType}:`, err)
      setError(`Failed to remove permission: ${err.message || "Unknown error"}`)
    }
  }

  const handleTogglePermission = async (permissionId: string, field: string, value: boolean) => {
    try {
      setSuccessMessage(null)
      const { error } = await supabase
        .from(permissionsTable)
        .update({ [field]: value })
        .eq("id", permissionId)

      if (error) {
        throw error
      }

      // Update local state
      setPermissions(permissions.map((p) => (p.id === permissionId ? { ...p, [field]: value } : p)))

      setSuccessMessage("Permission updated successfully")
    } catch (err: any) {
      console.error(`Error updating permission for ${trackerType}:`, err)
      setError(`Failed to update permission: ${err.message || "Unknown error"}`)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="default" className="bg-green-50 text-green-800 border-green-200">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add User</CardTitle>
          <CardDescription>Grant a user access to the {trackerName}</CardDescription>
        </CardHeader>
        <CardContent>
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
            <Button type="button" onClick={handleAddUser} disabled={addingUser || !newUserEmail} className="mb-0.5">
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Permissions</CardTitle>
          <CardDescription>Manage access levels for users</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading permissions...</p>
          ) : permissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users have been granted access yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>View</TableHead>
                  <TableHead>Edit</TableHead>
                  <TableHead>Delete</TableHead>
                  <TableHead>Manage</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell>{permission.user_email}</TableCell>
                    <TableCell>
                      <Switch
                        checked={permission.can_view}
                        onCheckedChange={(checked) => handleTogglePermission(permission.id, "can_view", checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={permission.can_edit}
                        onCheckedChange={(checked) => handleTogglePermission(permission.id, "can_edit", checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={permission.can_delete}
                        onCheckedChange={(checked) => handleTogglePermission(permission.id, "can_delete", checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={permission.can_manage}
                        onCheckedChange={(checked) => handleTogglePermission(permission.id, "can_manage", checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePermission(permission.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
