"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2, Search, UserPlus, RefreshCw, UserCheck, UserX, ShieldAlert } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  created_at: string
  is_admin: boolean
  last_sign_in_at?: string
  role?: string
}

interface UserManagementProps {
  currentUser: any
}

export function UserManagement({ currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    ensureCurrentUserIsAdmin()
    fetchUsers()
  }, [])

  // Ensure the current user is an admin using the server API
  const ensureCurrentUserIsAdmin = async () => {
    try {
      const response = await fetch("/api/admin/manage-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "ensure-admin",
          userId: currentUser.id,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setIsCurrentUserAdmin(true)
        if (result.created) {
          console.log("Current user added as admin")
          toast({
            title: "Admin Access Granted",
            description: "You have been granted admin access to the system.",
          })
        }
      } else {
        console.error("Error ensuring admin status:", result.error)
        // If the user is not an admin, we'll still check if they're in the admin_users table
        checkAdminStatus()
      }
    } catch (error) {
      console.error("Error in ensureCurrentUserIsAdmin:", error)
      // If there's an error, we'll still check if they're in the admin_users table
      checkAdminStatus()
    }
  }

  // Check if the current user is in the admin_users table
  const checkAdminStatus = async () => {
    try {
      const { data: adminCheck } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", currentUser.id)
        .single()

      if (adminCheck) {
        setIsCurrentUserAdmin(true)
      }
    } catch (error) {
      console.error("Error checking admin status:", error)
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch all users from the profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })

      if (profilesError) throw profilesError

      // Get admin users to mark them appropriately
      const { data: adminUsers, error: adminError } = await supabase.from("admin_users").select("user_id")

      // If admin_users table doesn't exist yet, handle gracefully
      if (adminError) {
        console.warn("Admin users table error:", adminError)
        // Continue with empty admin users list
      }

      // Create a set of admin user IDs for quick lookup
      const adminUserIds = new Set(adminUsers?.map((admin) => admin.user_id) || [])

      // Always ensure current user is in the admin set if they're an admin
      if (isCurrentUserAdmin) {
        adminUserIds.add(currentUser.id)
      }

      // Map profiles to our User interface
      const mappedUsers =
        profiles?.map((profile) => ({
          id: profile.id,
          email: profile.email || "No email",
          first_name: profile.first_name,
          last_name: profile.last_name,
          created_at: profile.created_at,
          is_admin: adminUserIds.has(profile.id),
          last_sign_in_at: profile.last_sign_in_at,
          role: profile.role || "User",
        })) || []

      setUsers(mappedUsers)
    } catch (error: any) {
      console.error("Error fetching users:", error)
      setError(error.message || "Failed to fetch users")
      toast({
        title: "Error fetching users",
        description: error.message || "There was a problem loading the user list.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) return

    setIsSubmitting(true)
    try {
      // Create a signup link that the admin can share
      const { data, error: signupError } = await supabase.auth.signInWithOtp({
        email: newUserEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signupError) throw signupError

      toast({
        title: "Invitation sent",
        description: `An email has been sent to ${newUserEmail} with instructions to join.`,
      })

      // Reset form
      setNewUserEmail("")
      setIsAdmin(false)
      setAddUserDialogOpen(false)

      // Refresh the user list after a short delay to allow for the user to be created
      setTimeout(fetchUsers, 5000)
    } catch (error: any) {
      console.error("Error adding user:", error)
      toast({
        title: "Error adding user",
        description: error.message || "There was a problem adding the new user.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      // Prevent removing admin status from current user
      if (userId === currentUser.id && currentStatus) {
        toast({
          title: "Cannot remove admin",
          description: "You cannot remove admin status from yourself.",
          variant: "destructive",
        })
        return
      }

      // Use the server API to toggle admin status
      const response = await fetch("/api/admin/manage-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: currentStatus ? "remove-admin" : "add-admin",
          userId: userId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update admin status")
      }

      // Update local state
      setUsers(users.map((user) => (user.id === userId ? { ...user, is_admin: !currentStatus } : user)))

      toast({
        title: "User updated",
        description: `Admin status ${!currentStatus ? "granted" : "revoked"}.`,
      })
    } catch (error: any) {
      console.error("Error toggling admin status:", error)
      toast({
        title: "Error updating user",
        description: error.message || "There was a problem updating the user's admin status.",
        variant: "destructive",
      })
    }
  }

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.role && user.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.first_name && user.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.last_name && user.last_name.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleString()
  }

  // Get user's full name or email
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
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setAddUserDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          {isCurrentUserAdmin && (
            <Badge className="bg-green-500 flex items-center">
              <ShieldAlert className="h-3 w-3 mr-1" />
              Admin Access
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No users match your search" : "No users found"}
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Sign In</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {getUserDisplayName(user)}
                        {user.id === currentUser.id && (
                          <Badge variant="outline" className="ml-2">
                            You
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role || "User"}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        {user.last_sign_in_at ? (
                          <span className="flex items-center">
                            <UserCheck className="h-4 w-4 mr-1 text-green-500" />
                            {formatDate(user.last_sign_in_at)}
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <UserX className="h-4 w-4 mr-1 text-gray-400" />
                            Never
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.is_admin ? (
                          <Badge className="bg-green-500">Admin</Badge>
                        ) : (
                          <Badge variant="outline">User</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Switch
                            checked={user.is_admin}
                            onCheckedChange={() => toggleAdminStatus(user.id, user.is_admin)}
                            id={`admin-switch-${user.id}`}
                            disabled={user.id === currentUser.id} // Prevent toggling own admin status
                          />
                          <Label htmlFor={`admin-switch-${user.id}`} className="ml-2">
                            Admin
                          </Label>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="admin" checked={isAdmin} onCheckedChange={setIsAdmin} />
              <Label htmlFor="admin">Make this user an admin</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser} disabled={!newUserEmail.trim() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
                </>
              ) : (
                "Add User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
