"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Trash2, Save } from "lucide-react"

interface RolesManagementProps {
  roles: string[]
}

export function RolesManagement({ roles: initialRoles }: RolesManagementProps) {
  const [roles, setRoles] = useState<string[]>(initialRoles)
  const [newRoleDialogOpen, setNewRoleDialogOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const handleAddRole = async () => {
    if (!newRoleName.trim()) return

    setIsSubmitting(true)
    try {
      // In a real application, you would add the role to your database
      // For this example, we'll just update the local state

      // Check if role already exists
      if (roles.includes(newRoleName.toLowerCase())) {
        toast({
          title: "Role already exists",
          description: `The role "${newRoleName}" already exists.`,
          variant: "destructive",
        })
        return
      }

      // Add the new role
      setRoles([...roles, newRoleName.toLowerCase()])

      toast({
        title: "Role added",
        description: `The role "${newRoleName}" has been added.`,
      })

      // Reset form
      setNewRoleName("")
      setNewRoleDialogOpen(false)
    } catch (error) {
      console.error("Error adding role:", error)
      toast({
        title: "Error adding role",
        description: "There was a problem adding the new role.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRole = (role: string) => {
    // Don't allow deleting the admin role
    if (role === "admin") {
      toast({
        title: "Cannot delete admin role",
        description: "The admin role is required and cannot be deleted.",
        variant: "destructive",
      })
      return
    }

    // In a real application, you would remove the role from your database
    // For this example, we'll just update the local state
    setRoles(roles.filter((r) => r !== role))

    toast({
      title: "Role deleted",
      description: `The role "${role}" has been deleted.`,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Available Roles</h3>
        <Button onClick={() => setNewRoleDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      </div>

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role}>
                <TableCell className="font-medium capitalize">{role}</TableCell>
                <TableCell>
                  {role === "admin" ? (
                    <Badge className="bg-green-500">System</Badge>
                  ) : (
                    <Badge variant="outline">Custom</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteRole(role)} disabled={role === "admin"}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {roles.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                  No roles found. Add a role to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Role Dialog */}
      <Dialog open={newRoleDialogOpen} onOpenChange={setNewRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                placeholder="Enter role name"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRole} disabled={!newRoleName.trim() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Add Role
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
