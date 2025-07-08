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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trash2, Users, Plus, Loader2, Search, UserPlus, Shield, Edit, Eye } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
}

interface Permission {
  id: string
  user_id: string
  permission_level: "read" | "write" | "admin"
  granted_at: string
  granted_by: string
  user: User
}

interface SheetPermissionsDialogV3Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  sheetId: string
  sheetName: string
}

export default function SheetPermissionsDialogV3({
  open,
  onOpenChange,
  sheetId,
  sheetName,
}: SheetPermissionsDialogV3Props) {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [searchUsers, setSearchUsers] = useState<User[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newPermissionLevel, setNewPermissionLevel] = useState<"read" | "write" | "admin">("read")
  const supabase = createClient()

  const fetchPermissions = async () => {
    if (!open) return

    setLoading(true)
    try {
      const response = await fetch(`/api/sheets/${sheetId}/permissions`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch permissions")
      }

      setPermissions(data.permissions || [])
    } catch (error) {
      console.error("Error fetching permissions:", error)
      toast.error("Failed to load permissions")
    } finally {
      setLoading(false)
    }
  }

  const searchUsersFunction = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchUsers([])
      return
    }

    setSearchLoading(true)
    try {
      const response = await fetch(`/api/sheets/${sheetId}/users/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to search users")
      }

      setSearchUsers(data.users || [])
    } catch (error) {
      console.error("Error searching users:", error)
      setSearchUsers([])
    } finally {
      setSearchLoading(false)
    }
  }

  const addPermission = async () => {
    if (!selectedUser) {
      toast.error("Please select a user")
      return
    }

    setAdding(true)
    try {
      const response = await fetch(`/api/sheets/${sheetId}/permissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: selectedUser.email,
          permission_level: newPermissionLevel,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add user")
      }

      toast.success(data.message || "User added successfully")
      setSelectedUser(null)
      setSearchQuery("")
      setNewPermissionLevel("read")
      setSearchOpen(false)
      await fetchPermissions()
    } catch (error) {
      console.error("Error adding permission:", error)
      toast.error(error instanceof Error ? error.message : "Failed to add user")
    } finally {
      setAdding(false)
    }
  }

  const removePermission = async (permissionId: string, userEmail: string) => {
    try {
      const response = await fetch(`/api/sheets/${sheetId}/permissions/${permissionId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove user")
      }

      toast.success(data.message || "User removed successfully")
      await fetchPermissions()
    } catch (error) {
      console.error("Error removing permission:", error)
      toast.error(error instanceof Error ? error.message : "Failed to remove user")
    }
  }

  const updatePermission = async (permissionId: string, newLevel: "read" | "write" | "admin") => {
    try {
      const response = await fetch(`/api/sheets/${sheetId}/permissions/${permissionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          permission_level: newLevel,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update permission")
      }

      toast.success(data.message || "Permission updated successfully")
      await fetchPermissions()
    } catch (error) {
      console.error("Error updating permission:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update permission")
    }
  }

  useEffect(() => {
    if (open) {
      fetchPermissions()
    }
  }, [open])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsersFunction(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const getPermissionIcon = (level: string) => {
    switch (level) {
      case "admin":
        return <Shield className="h-4 w-4" />
      case "write":
        return <Edit className="h-4 w-4" />
      case "read":
        return <Eye className="h-4 w-4" />
      default:
        return <Eye className="h-4 w-4" />
    }
  }

  const getPermissionBadgeVariant = (level: string) => {
    switch (level) {
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

  const getUserInitials = (user: User) => {
    if (user.full_name) {
      return user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return user.email.slice(0, 2).toUpperCase()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sheet Permissions - {sheetName}
          </DialogTitle>
          <DialogDescription>
            Manage who can access this sheet and their permission levels. Users are loaded from your profiles database.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New User */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add New User
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="user-search">Search Users</Label>
                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={searchOpen}
                      className="w-full justify-between bg-transparent"
                    >
                      {selectedUser ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={selectedUser.avatar_url || "/placeholder.svg"} />
                            <AvatarFallback className="text-xs">{getUserInitials(selectedUser)}</AvatarFallback>
                          </Avatar>
                          <span className="truncate">{selectedUser.full_name || selectedUser.email}</span>
                        </div>
                      ) : (
                        "Search and select user..."
                      )}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search users by email or name..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                      />
                      <CommandList>
                        {searchLoading ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="ml-2">Searching...</span>
                          </div>
                        ) : searchUsers.length === 0 && searchQuery.length >= 2 ? (
                          <CommandEmpty>No users found.</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {searchUsers.map((user) => (
                              <CommandItem
                                key={user.id}
                                value={user.email}
                                onSelect={() => {
                                  setSelectedUser(user)
                                  setSearchOpen(false)
                                }}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.avatar_url || "/placeholder.svg"} />
                                    <AvatarFallback className="text-xs">{getUserInitials(user)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{user.full_name || user.email}</div>
                                    {user.full_name && (
                                      <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                                    )}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="permission">Permission Level</Label>
                <Select
                  value={newPermissionLevel}
                  onValueChange={(value: "read" | "write" | "admin") => setNewPermissionLevel(value)}
                  disabled={adding}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Read Only
                      </div>
                    </SelectItem>
                    <SelectItem value="write">
                      <div className="flex items-center gap-2">
                        <Edit className="h-4 w-4" />
                        Read & Write
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Admin
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={addPermission} disabled={adding || !selectedUser} className="w-full">
              {adding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding User...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Grant Access
                </>
              )}
            </Button>
          </div>

          {/* Current Permissions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Current Users ({permissions.length})</h4>
              {permissions.length > 0 && (
                <Button variant="outline" size="sm" onClick={fetchPermissions} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                </Button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading permissions...</span>
              </div>
            ) : permissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users have been granted access to this sheet yet.</p>
                <p className="text-sm">Use the form above to add users.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {permissions.map((permission) => (
                  <div key={permission.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={permission.user.avatar_url || "/placeholder.svg"} />
                        <AvatarFallback>{getUserInitials(permission.user)}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{permission.user.full_name || permission.user.email}</div>
                        {permission.user.full_name && (
                          <div className="text-sm text-muted-foreground truncate">{permission.user.email}</div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Added {new Date(permission.granted_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={permission.permission_level}
                        onValueChange={(value: "read" | "write" | "admin") => updatePermission(permission.id, value)}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read">
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              Read Only
                            </div>
                          </SelectItem>
                          <SelectItem value="write">
                            <div className="flex items-center gap-2">
                              <Edit className="h-4 w-4" />
                              Read & Write
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Admin
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Badge variant={getPermissionBadgeVariant(permission.permission_level)} className="gap-1">
                        {getPermissionIcon(permission.permission_level)}
                        {permission.permission_level}
                      </Badge>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePermission(permission.id, permission.user.email)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
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
