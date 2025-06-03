"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, UserPlus, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FolderPermission {
  id: string
  user_id: string
  user_email?: string
  can_view: boolean
  can_edit: boolean
  can_delete: boolean
}

interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
}

export default function FolderPermissionsManager({
  folderId,
  folderName,
  siteType,
}: {
  folderId: string
  folderName: string
  siteType: string
}) {
  const [permissions, setPermissions] = useState<FolderPermission[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [manualEmail, setManualEmail] = useState("")
  const [canView, setCanView] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [canDelete, setCanDelete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isCreator, setIsCreator] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        setCurrentUser(data.user)

        // Check if user is admin
        const { data: adminUser } = await supabase.from("admin_users").select("id").eq("user_id", data.user.id).single()

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
      setAddDialogOpen(false)
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
    // Prevent deleting own permission if user is not admin or creator
    if (currentUser && userId === currentUser.id && !isAdmin && !isCreator) {
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
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setAddDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : permissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No permissions set for this folder</div>
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
                          disabled={!isAdmin && !isCreator && currentUser && permission.user_id === currentUser.id}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={permission.can_edit}
                          onCheckedChange={(value) => handleUpdatePermission(permission.id, "can_edit", value)}
                          disabled={!isAdmin && !isCreator && currentUser && permission.user_id === currentUser.id}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={permission.can_delete}
                          onCheckedChange={(value) => handleUpdatePermission(permission.id, "can_delete", value)}
                          disabled={!isAdmin && !isCreator && currentUser && permission.user_id === currentUser.id}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePermission(permission.id, permission.user_id)}
                          disabled={!isAdmin && !isCreator && currentUser && permission.user_id === currentUser.id}
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
        </CardContent>
      </Card>

      {/* Add Permission Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User Permission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
              {selectedUserId && (
                <p className="text-xs text-muted-foreground">
                  Clear the user selection above to enter an email manually
                </p>
              )}
            </div>

            <div className="space-y-4 pt-4">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPermission} disabled={(!selectedUserId && !manualEmail) || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
                </>
              ) : (
                "Add Permission"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
