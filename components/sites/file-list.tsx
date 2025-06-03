"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import { AlertCircle, Download, FileText, ImageIcon, Trash, FileArchive, File, Info, HelpCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface FileListProps {
  folderId: string
  onFileDeleted?: () => void
}

// Special prefix to identify metadata-only files
const METADATA_PREFIX = "metadata_only/"

export function FileList({ folderId, onFileDeleted }: FileListProps) {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<any | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [userMap, setUserMap] = useState<Map<string, any>>(new Map())
  const supabase = createClient()

  useEffect(() => {
    loadFiles()
  }, [folderId])

  const loadFiles = async () => {
    setLoading(true)
    setError(null)

    try {
      // First, get all files for the folder
      const { data: files, error } = await supabase
        .from("folder_files")
        .select("*")
        .eq("folder_id", folderId)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      if (files && files.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(files.map((file) => file.uploaded_by))]

        // Fetch user profiles for these IDs - use a more generic query
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("*") // Select all columns instead of specific ones
          .in("id", userIds)

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError)
        }

        // Create a map of user IDs to profiles
        const userMap = new Map()
        if (profiles) {
          profiles.forEach((profile) => {
            userMap.set(profile.id, profile)
          })
        }

        setUserMap(userMap)
      }

      setFiles(files || [])
    } catch (error: any) {
      console.error("Error loading files:", error)
      setError(`Error loading files: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const isMetadataOnly = (file: any) => {
    return file.file_path.startsWith(METADATA_PREFIX)
  }

  const handleDeleteFile = async () => {
    if (!selectedFile) return

    setDeleting(true)

    try {
      // Only try to delete from storage if it's not a metadata-only file
      if (!isMetadataOnly(selectedFile)) {
        // Try to delete from storage using different bucket names
        const bucketNames = ["site-files", "public", "files", "folder-files", "documents"]
        let deleted = false

        for (const bucketName of bucketNames) {
          try {
            const { error: storageError } = await supabase.storage.from(bucketName).remove([selectedFile.file_path])

            if (!storageError) {
              deleted = true
              break
            }
          } catch (error) {
            console.log(`Failed to delete from bucket ${bucketName}:`, error)
            // Continue to next bucket
          }
        }

        if (!deleted) {
          console.warn("Could not delete file from storage, but will continue to delete database record")
        }
      }

      // Delete file record from database
      const { error: dbError } = await supabase.from("folder_files").delete().eq("id", selectedFile.id)

      if (dbError) {
        throw dbError
      }

      toast({
        title: "File deleted",
        description: "The file has been deleted successfully",
      })

      // Remove file from state
      setFiles(files.filter((file) => file.id !== selectedFile.id))

      // Notify parent component
      if (onFileDeleted) {
        onFileDeleted()
      }
    } catch (error: any) {
      console.error("Error deleting file:", error)
      toast({
        title: "Delete failed",
        description: error.message || "An error occurred while deleting the file",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setSelectedFile(null)
    }
  }

  const handleDownload = async (file: any) => {
    try {
      // Only try to download if it's not a metadata-only file
      if (isMetadataOnly(file)) {
        toast({
          title: "Cannot download",
          description: "This is a metadata-only entry. The actual file is not stored in the system.",
          variant: "warning",
        })
        return
      }

      // Try different bucket names
      const bucketNames = ["site-files", "public", "files", "folder-files", "documents"]
      let downloaded = false

      for (const bucketName of bucketNames) {
        try {
          const { data, error } = await supabase.storage.from(bucketName).download(file.file_path)

          if (!error && data) {
            // Create a download link
            const url = URL.createObjectURL(data)
            const a = document.createElement("a")
            a.href = url
            a.download = file.file_name
            document.body.appendChild(a)
            a.click()
            URL.revokeObjectURL(url)
            document.body.removeChild(a)

            downloaded = true
            break
          }
        } catch (error) {
          console.log(`Failed to download from bucket ${bucketName}:`, error)
          // Continue to next bucket
        }
      }

      if (!downloaded) {
        throw new Error("Could not download file from any storage bucket")
      }
    } catch (error: any) {
      console.error("Error downloading file:", error)
      toast({
        title: "Download failed",
        description: error.message || "An error occurred while downloading the file",
        variant: "destructive",
      })
    }
  }

  const getFileIcon = (file: any) => {
    if (file.file_type.startsWith("image/")) {
      return <ImageIcon className="h-8 w-8 text-blue-500" />
    } else if (file.file_type === "application/pdf") {
      return <FileText className="h-8 w-8 text-red-500" />
    } else if (
      file.file_type === "application/zim" ||
      file.file_type === "application/x-zim" ||
      file.file_name.endsWith(".zim")
    ) {
      return <FileArchive className="h-8 w-8 text-amber-500" />
    } else {
      return <File className="h-8 w-8 text-gray-500" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes"
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    else return (bytes / 1048576).toFixed(1) + " MB"
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString()
  }

  const getUserName = (userId: string) => {
    const user = userMap.get(userId)
    if (user) {
      // Try different possible name fields
      return user.full_name || user.name || user.display_name || user.email || user.username || userId
    }
    return userId || "Unknown user"
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>No files have been uploaded to this folder yet.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Files ({files.length})</h3>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center text-sm text-muted-foreground cursor-help">
                <HelpCircle className="h-4 w-4 mr-1" />
                About Metadata-only Files
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                Files with a "Metadata Only" badge are records of files that exist elsewhere. The actual file content is
                not stored in the system, only information about the file.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {files.map((file) => (
          <Card
            key={file.id}
            className={`overflow-hidden ${isMetadataOnly(file) ? "border-blue-200 bg-blue-50/30" : ""}`}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-3">
                  {getFileIcon(file)}
                  <div>
                    <CardTitle className="text-base">{file.file_name}</CardTitle>
                    <CardDescription className="text-xs">
                      {formatFileSize(file.file_size)} • {file.file_type}
                    </CardDescription>
                  </div>
                </div>
                {isMetadataOnly(file) && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Metadata Only
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              {file.description && <p className="text-sm text-muted-foreground mb-2">{file.description}</p>}
              <div className="text-xs text-muted-foreground">
                <p>Uploaded by: {getUserName(file.uploaded_by)}</p>
                <p>Date: {formatDate(file.created_at)}</p>
              </div>

              {isMetadataOnly(file) && (
                <Alert variant="info" className="mt-2 py-2 px-3 bg-blue-50 border-blue-200">
                  <Info className="h-3 w-3 text-blue-500" />
                  <AlertDescription className="text-xs text-blue-700">
                    This is a metadata-only entry. The actual file is not stored in the system.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="pt-2">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(file)}
                  disabled={isMetadataOnly(file)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setSelectedFile(file)
                    setDeleteDialogOpen(true)
                  }}
                >
                  <Trash className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedFile && (
            <div className="flex items-center space-x-3 py-2">
              {getFileIcon(selectedFile)}
              <div>
                <p className="font-medium">{selectedFile.file_name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.file_size)} • {selectedFile.file_type}
                </p>
                {isMetadataOnly(selectedFile) && (
                  <Badge variant="outline" className="mt-1 bg-blue-50 text-blue-700 border-blue-200">
                    Metadata Only
                  </Badge>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFile} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
