"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { FileText, MoreVertical, Download, Trash2, Eye, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Document {
  id: string
  name: string
  file_path: string
  file_type: string
  file_size: number
  uploaded_by: string
  uploaded_at: string
  last_accessed_at: string | null
  uploader_name?: string
}

interface DocumentListProps {
  folderId: string
  canEdit: boolean
  refreshTrigger: number
}

export function DocumentList({ folderId, canEdit, refreshTrigger }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const supabase = createClient()

  // Load documents
  useEffect(() => {
    async function loadDocuments() {
      setLoading(true)
      setError(null)

      try {
        const { data, error } = await supabase
          .from("folder_documents")
          .select(`
            *,
            profiles:uploaded_by (full_name, email)
          `)
          .eq("folder_id", folderId)
          .order("uploaded_at", { ascending: false })

        if (error) {
          throw error
        }

        // Transform data to include uploader name
        const transformedData = data.map((doc) => ({
          ...doc,
          uploader_name: doc.profiles?.full_name || doc.profiles?.email || "Unknown user",
        }))

        setDocuments(transformedData)
      } catch (err: any) {
        console.error("Error loading documents:", err)
        setError(err.message || "Failed to load documents")
      } finally {
        setLoading(false)
      }
    }

    loadDocuments()
  }, [supabase, folderId, refreshTrigger])

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes"
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    else return (bytes / 1048576).toFixed(1) + " MB"
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  // Handle document download
  const handleDownload = async (document: Document) => {
    try {
      // Update last accessed timestamp
      await supabase
        .from("folder_documents")
        .update({ last_accessed_at: new Date().toISOString() })
        .eq("id", document.id)

      // Get download URL
      const { data, error } = await supabase.storage.from("documents").createSignedUrl(document.file_path, 60)

      if (error) {
        throw error
      }

      // Open download in new tab
      window.open(data.signedUrl, "_blank")
    } catch (err: any) {
      console.error("Download error:", err)
      toast({
        title: "Download Failed",
        description: err.message || "Failed to download file",
        variant: "destructive",
      })
    }
  }

  // Handle document view
  const handleView = async (document: Document) => {
    try {
      // Update last accessed timestamp
      await supabase
        .from("folder_documents")
        .update({ last_accessed_at: new Date().toISOString() })
        .eq("id", document.id)

      // Get URL for viewing
      const { data, error } = await supabase.storage.from("documents").createSignedUrl(document.file_path, 60)

      if (error) {
        throw error
      }

      // Open in new tab
      window.open(data.signedUrl, "_blank")
    } catch (err: any) {
      console.error("View error:", err)
      toast({
        title: "View Failed",
        description: err.message || "Failed to view file",
        variant: "destructive",
      })
    }
  }

  // Handle document delete
  const handleDelete = async () => {
    if (!documentToDelete) return

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage.from("documents").remove([documentToDelete.file_path])

      if (storageError) {
        throw storageError
      }

      // Delete from database
      const { error: dbError } = await supabase.from("folder_documents").delete().eq("id", documentToDelete.id)

      if (dbError) {
        throw dbError
      }

      // Update state
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentToDelete.id))

      toast({
        title: "Document Deleted",
        description: "The document has been deleted successfully",
      })
    } catch (err: any) {
      console.error("Delete error:", err)
      toast({
        title: "Delete Failed",
        description: err.message || "Failed to delete document",
        variant: "destructive",
      })
    } finally {
      setDocumentToDelete(null)
      setDeleteDialogOpen(false)
    }
  }

  // Confirm delete
  const confirmDelete = (document: Document) => {
    setDocumentToDelete(document)
    setDeleteDialogOpen(true)
  }

  // Render loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  // Render empty state
  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-6">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground">No documents in this folder yet</p>
          <p className="text-sm text-center text-muted-foreground">Upload documents to get started</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Uploaded By</TableHead>
            <TableHead>Uploaded At</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => (
            <TableRow key={document.id}>
              <TableCell className="font-medium">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="truncate max-w-[200px]">{document.name}</span>
                </div>
              </TableCell>
              <TableCell>{document.file_type.split("/")[1]?.toUpperCase() || document.file_type}</TableCell>
              <TableCell>{formatFileSize(document.file_size)}</TableCell>
              <TableCell>{document.uploader_name}</TableCell>
              <TableCell>{formatDate(document.uploaded_at)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleView(document)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload(document)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    {canEdit && (
                      <DropdownMenuItem
                        onClick={() => confirmDelete(document)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the document &quot;{documentToDelete?.name}&quot;. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
