"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, FolderPlus, Folder, Settings, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { DirectPermissionEntry } from "./direct-permission-entry"

interface FolderType {
  id: string
  name: string
  description: string | null
  created_at: string
  created_by: string
}

export function FolderManagement({ category }: { category: string }) {
  const [folders, setFolders] = useState<FolderType[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedFolderName, setSelectedFolderName] = useState<string>("")
  const [newFolderName, setNewFolderName] = useState("")
  const [newFolderDescription, setNewFolderDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchFolders()
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    const { data: user } = await supabase.auth.getUser()
    if (user) {
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", user.user?.id)
        .maybeSingle()

      setIsAdmin(!!adminUser)
    }
  }

  const fetchFolders = async () => {
    setLoading(true)
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      // Get folders where user is creator
      const { data: ownedFolders, error: ownedError } = await supabase
        .from("site_folders")
        .select("*")
        .eq("site_type", category)
        .eq("created_by", user.user.id)

      if (ownedError) throw ownedError

      // Get folders where user has permissions
      const { data: permissionFolders, error: permissionError } = await supabase
        .from("folder_permissions")
        .select("folder_id")
        .eq("user_id", user.user.id)
        .eq("can_view", true)

      if (permissionError) throw permissionError

      // If user has permission folders, fetch those folder details
      let sharedFolders: any[] = []
      if (permissionFolders && permissionFolders.length > 0) {
        const folderIds = permissionFolders.map((p) => p.folder_id)
        const { data: folders, error: foldersError } = await supabase
          .from("site_folders")
          .select("*")
          .eq("site_type", category)
          .in("id", folderIds)

        if (foldersError) throw foldersError
        sharedFolders = folders || []
      }

      // Check if user is admin
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", user.user.id)
        .maybeSingle()

      // If admin, get all folders
      let adminFolders: any[] = []
      if (adminUser) {
        const { data: folders, error: foldersError } = await supabase
          .from("site_folders")
          .select("*")
          .eq("site_type", category)
          .not("created_by", "eq", user.user.id) // Exclude already fetched owned folders

        if (foldersError) throw foldersError
        adminFolders = folders || []
      }

      // Combine all folders and remove duplicates
      const allFolders = [...(ownedFolders || []), ...sharedFolders, ...adminFolders]
      const uniqueFolders = allFolders.filter(
        (folder, index, self) => index === self.findIndex((f) => f.id === folder.id),
      )

      setFolders(uniqueFolders)
    } catch (error: any) {
      console.error("Error fetching folders:", error)
      toast({
        title: "Error",
        description: "Failed to load folders",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error("User not authenticated")

      const { data, error } = await supabase
        .from("site_folders")
        .insert({
          name: newFolderName.trim(),
          description: newFolderDescription.trim() || null,
          site_type: category,
          created_by: user.user.id,
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Success",
        description: "Folder created successfully",
      })

      // Reset form and refresh
      setNewFolderName("")
      setNewFolderDescription("")
      setCreateDialogOpen(false)
      fetchFolders()
    } catch (error: any) {
      console.error("Error creating folder:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create folder",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openPermissionsDialog = (folderId: string, folderName: string) => {
    setSelectedFolderId(folderId)
    setSelectedFolderName(folderName)
    setPermissionsDialogOpen(true)
  }

  const openDeleteDialog = (folderId: string, folderName: string) => {
    setSelectedFolderId(folderId)
    setSelectedFolderName(folderName)
    setDeleteDialogOpen(true)
  }

  const handleDeleteFolder = async () => {
    if (!selectedFolderId || isDeleting) return

    setIsDeleting(true)
    try {
      // First delete folder permissions
      const { error: permissionsError } = await supabase
        .from("folder_permissions")
        .delete()
        .eq("folder_id", selectedFolderId)

      if (permissionsError) {
        console.error("Error deleting folder permissions:", permissionsError)
        // Continue with deletion even if permissions deletion fails
      }

      // Delete folder files
      const { error: filesError } = await supabase.from("folder_files").delete().eq("folder_id", selectedFolderId)

      if (filesError) {
        console.error("Error deleting folder files:", filesError)
        // Continue with deletion even if files deletion fails
      }

      // Delete the folder
      const { error } = await supabase.from("site_folders").delete().eq("id", selectedFolderId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Folder deleted successfully",
      })

      // Reset and refresh
      setDeleteDialogOpen(false)
      setSelectedFolderId(null)
      setSelectedFolderName("")
      fetchFolders()
    } catch (error: any) {
      console.error("Error deleting folder:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete folder",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Folders</h2>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <FolderPlus className="h-4 w-4 mr-2" />
          Create Folder
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : folders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Folder className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No folders found</p>
            <Button onClick={() => setCreateDialogOpen(true)}>Create Your First Folder</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map((folder) => (
            <Card
              key={folder.id}
              className="overflow-hidden hover:shadow-md transition-shadow duration-200 border-l-4 border-l-primary"
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Folder className="h-5 w-5 text-primary" />
                    <span className="truncate font-medium">{folder.name}</span>
                  </div>

                  {/* Admin actions */}
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openPermissionsDialog(folder.id, folder.name)}
                        title="Manage Permissions"
                        className="h-8 w-8"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(folder.id, folder.name)}
                        className="text-destructive hover:text-destructive h-8 w-8"
                        title="Delete Folder"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardTitle>
                {folder.description && (
                  <CardDescription className="line-clamp-2 text-sm mt-1">{folder.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="flex justify-between items-center mt-2">
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(folder.created_at).toLocaleDateString()}
                  </div>
                  <Button asChild size="sm" className="gap-1">
                    <Link href={`/sites/${category}/folders/${folder.id}`}>
                      Open <span className="sr-only">folder {folder.name}</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Folder Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Folder Name</Label>
              <Input
                id="name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={newFolderDescription}
                onChange={(e) => setNewFolderDescription(e.target.value)}
                placeholder="Enter folder description"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                "Create Folder"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      {selectedFolderId && (
        <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Manage Folder Permissions: {selectedFolderName}</DialogTitle>
            </DialogHeader>
            <DirectPermissionEntry folderId={selectedFolderId} onClose={() => setPermissionsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the folder "{selectedFolderName}"? This action cannot be undone and will
              remove all files and permissions associated with this folder.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFolder} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete Folder"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
