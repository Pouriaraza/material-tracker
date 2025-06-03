"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
}

interface Permission {
  id: string
  user_id: string
  user_email?: string
  can_view: boolean
  can_edit: boolean
  can_delete: boolean
}

export function DirectPermissionEntry({
  folderId,
  onClose,
}: {
  folderId: string
  onClose: () => void
}) {
  const [users, setUsers] = useState<User[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [manualEmail, setManualEmail] = useState("")
  const [canView, setCanView] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [canDelete, setCanDelete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        setCurrentUser(data.user)

        // Check if user is admin
        const { data: adminUser } = await supabase
          .from("admin_users")
          .select("id")
          .eq("user_id", data.user.id)
          .maybeSingle()

        setIsAdmin(!!adminUser)

        // Check if user is folder creator
        const { data: folder } = await supabase.from("site_folders").select("created_by").eq("id", folderId).single()

        setIsCreator(folder?.created_by === data.user.id)
      }
    }

    fetchCurrentUser()
    fetchPermissions()
    fetchUsers()
  }, [folderId])

  const fetchPermissions = async () => {
    setLoading(true)
    try {
      const { data: permissionsData, error: permissionsError } = await supabase
        .from("folder_permissions")
        .select("*")
        .eq("folder_id", folderId)

      if (permissionsError) throw permissionsError

      // Get user emails for each permission
      const permissionsWithEmails = await Promise.all(
        permissionsData.map(async (permission) => {
          const { data: userData, error: userError } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", permission.user_id)
            .single()

          if (userError && userError.code !== "PGRST116") {
            console.error("Error fetching user email:", userError)
          }

          return {
            ...permission,
            user_email: userData?.email || "Unknown User",
          }
        }),
      )

      setPermissions(permissionsWithEmails)
    } catch (error: any) {
      console.error("Error fetching permissions:", error)
      toast({
        title: "Error",
        description: "Failed to load folder permissions",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .order("email")

      if (usersError) throw usersError

      setUsers(usersData || [])
    } catch (error: any) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to load users list",
        variant: "destructive",
      })
    }
  }

  const handleAddPermission = async () => {
    if ((!selectedUserId && !manualEmail) || isSubmitting) return

    // Only admins and creators can add permissions
    if (!isAdmin && !isCreator) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to modify folder permissions",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      let userId = selectedUserId

      // If using manual email, check if user exists or create a placeholder
      if (!userId && manualEmail) {
        // Check if user with this email exists in profiles
        const { data: existingUser, error: userError } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", manualEmail)
          .single()

        if (userError && userError.code !== "PGRST116") {
          throw userError
        }

        if (existingUser) {
          userId = existingUser.id
        } else {
          // Create a placeholder in profiles table
          const { data: newUser, error: createError } = await supabase
            .from("profiles")
            .insert({
              email: manualEmail,
              role: "Invited User",
            })
            .select()

          if (createError) throw createError

          // Use the first created user's ID
          userId = newUser?.[0]?.id

          if (!userId) {
            throw new Error("Failed to create user profile")
          }

          // Refresh users list
          fetchUsers()
        }
      }

      // Check if permission already exists
      const { data: existingPermission, error: checkError } = await supabase
        .from("folder_permissions")
        .select("id")
        .eq("folder_id", folderId)
        .eq("user_id", userId)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError
      }

      if (existingPermission) {
        toast({
          title: "Permission exists",
          description: "This user already has permissions for this folder",
          variant: "destructive",
        })
        return
      }

      // Add permission
      const { error: insertError } = await supabase.from("folder_permissions").insert({
        folder_id: folderId,
        user_id: userId,
        can_view: canView,
        can_edit: canEdit,
        can_delete: canDelete,
      })

      if (insertError) throw insertError

      toast({
        title: "Success",
        description: "Permission added successfully",
      })

      // Reset form and refresh
      setSelectedUserId("")
      setManualEmail("")
      setCanView(true)
      setCanEdit(false)
      setCanDelete(false)
      fetchPermissions()
    } catch (error: any) {
      console.error("Error adding permission:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add permission",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePermission = async (permissionId: string, userId: string) => {
    // Only admins and creators can delete permissions
    if (!isAdmin && !isCreator) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to modify folder permissions",
        variant: "destructive",
      })
      return
    }

    // Prevent deleting own permission
    if (currentUser && userId === currentUser.id) {
      toast({
        title: "Cannot remove",
        description: "You cannot remove your own permissions",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase.from("folder_permissions").delete().eq("id", permissionId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Permission removed successfully",
      })

      // Refresh permissions
      fetchPermissions()
    } catch (error: any) {
      console.error("Error deleting permission:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to remove permission",
        variant: "destructive",
      })
    }
  }

  const handleUpdatePermission = async (permissionId: string, field: string, value: boolean) => {
    // Only admins and creators can update permissions
    if (!isAdmin && !isCreator) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to modify folder permissions",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from("folder_permissions")
        .update({ [field]: value })
        .eq("id", permissionId)

      if (error) throw error

      // Update local state
      setPermissions(
        permissions.map((permission) =>
          permission.id === permissionId ? { ...permission, [field]: value } : permission,
        ),
      )

      toast({
        title: "Success",
        description: "Permission updated successfully",
      })
    } catch (error: any) {
      console.error("Error updating permission:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update permission",
        variant: "destructive",
      })
    }
  }

  // Get user display name
  const getUserDisplayName = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    } else if (user.first_name) {
      return user.first_name
    } else {
      return user.email
    }
  }

  return (
    <div className="space-y-6">
      {/* Only show permission controls to admins and creators */}
      {isAdmin || isCreator ? (
        <>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Select User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {getUserDisplayName(user)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Or Enter Email Manually</Label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  disabled={!!selectedUserId}
                />
              </div>

              <div className="space-y-2 flex items-end">
                <Button
                  onClick={handleAddPermission}
                  disabled={(!selectedUserId && !manualEmail) || isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
                    </>
                  ) : (
                    "Add Permission"
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="can-view">Can View</Label>
                <Switch id="can-view" checked={canView} onCheckedChange={setCanView} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="can-edit">Can Edit</Label>
                <Switch id="can-edit" checked={canEdit} onCheckedChange={setCanEdit} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="can-delete">Can Delete</Label>
                <Switch id="can-delete" checked={canDelete} onCheckedChange={setCanDelete} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800">
          <p>You don't have permission to modify folder permissions.</p>
        </div>
      )}

      <div className="border-t pt-4">
        <h3 className="font-medium mb-2">Current Permissions</h3>
        {loading ? (
          <div className="flex justify-center items-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : permissions.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">No permissions set for this folder</div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>View</TableHead>
                  <TableHead>Edit</TableHead>
                  <TableHead>Delete</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell>
                      {permission.user_email}
                      {currentUser && permission.user_id === currentUser.id && (
                        <Badge variant="outline" className="ml-2">
                          You
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={permission.can_view}
                        onCheckedChange={(value) => handleUpdatePermission(permission.id, "can_view", value)}
                        disabled={!isAdmin && !isCreator}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={permission.can_edit}
                        onCheckedChange={(value) => handleUpdatePermission(permission.id, "can_edit", value)}
                        disabled={!isAdmin && !isCreator}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={permission.can_delete}
                        onCheckedChange={(value) => handleUpdatePermission(permission.id, "can_delete", value)}
                        disabled={!isAdmin && !isCreator}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePermission(permission.id, permission.user_id)}
                        disabled={(!isAdmin && !isCreator) || (currentUser && permission.user_id === currentUser.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {(isAdmin || isCreator) && (
          <Button asChild>
            <Link href={`/sites/${folderId}/permissions`}>Advanced Permissions</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
