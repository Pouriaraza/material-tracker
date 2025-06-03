"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, File, X, FileText, ImageIcon, FileArchive, Info, Settings, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface FileUploaderProps {
  folderId: string
  folderType: string
  onUploadComplete?: () => void
}

// Special prefix to identify metadata-only files
const METADATA_PREFIX = "metadata_only/"

export function FileUploader({ folderId, folderType, onUploadComplete }: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [description, setDescription] = useState("")
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [metadataOnly, setMetadataOnly] = useState(false)
  const [manualFileName, setManualFileName] = useState("")
  const [manualFileSize, setManualFileSize] = useState("")
  const [manualFileType, setManualFileType] = useState("")
  const [checkingStorage, setCheckingStorage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  // Maximum file size (50MB)
  const MAX_FILE_SIZE = 50 * 1024 * 1024

  // Allowed file types
  const ALLOWED_FILE_TYPES = [
    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    // PDFs
    "application/pdf",
    // ZIM files
    "application/zim",
    "application/x-zim",
    // Allow generic types that might contain ZIM files
    "application/octet-stream",
    "application/x-binary",
  ]

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        if (session && session.session) {
          const { data, error } = await supabase.rpc("is_admin", {
            user_id: session.session.user.id,
          })
          if (!error && data) {
            setIsAdmin(true)
          }
        }
      } catch (error) {
        console.error("Error checking admin status:", error)
      }
    }

    checkAdminStatus()
  }, [supabase])

  // Check for storage availability
  useEffect(() => {
    checkStorageAvailability()
  }, [supabase])

  const checkStorageAvailability = async () => {
    setCheckingStorage(true)
    try {
      // First try the API endpoint
      const response = await fetch("/api/storage/check-storage")

      if (response.ok) {
        const data = await response.json()
        if (data.available) {
          setStorageError(null)
          setMetadataOnly(false)
          setCheckingStorage(false)
          return
        }
      }

      // Fall back to client-side check
      const { data, error } = await supabase.storage.listBuckets()

      if (error) {
        console.error("Storage error:", error)
        setStorageError("Storage is not available. Please set up storage to enable file uploads.")
        setMetadataOnly(true)
      } else if (!data || data.length === 0) {
        setStorageError("No storage buckets found. Please set up storage to enable file uploads.")
        setMetadataOnly(true)
      } else {
        // Storage is available, reset error and metadata-only mode
        setStorageError(null)
        setMetadataOnly(false)
      }
    } catch (error) {
      console.error("Error checking storage:", error)
      setStorageError("Error checking storage. Please set up storage to enable file uploads.")
      setMetadataOnly(true)
    } finally {
      setCheckingStorage(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setSelectedFile(null)
      return
    }

    const file = e.target.files[0]
    handleFileSelection(file)
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon className="h-12 w-12 text-primary" />
    } else if (file.type === "application/pdf") {
      return <FileText className="h-12 w-12 text-primary" />
    } else if (file.type === "application/zim" || file.type === "application/x-zim" || file.name.endsWith(".zim")) {
      return <FileArchive className="h-12 w-12 text-primary" />
    } else {
      return <File className="h-12 w-12 text-primary" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes"
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    else return (bytes / 1048576).toFixed(1) + " MB"
  }

  const handleFileSelection = (file: File) => {
    // Reset storage error when selecting a new file
    setStorageError(null)

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        variant: "destructive",
      })
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type) && !file.name.endsWith(".zim")) {
      toast({
        title: "Unsupported file type",
        description: "Please upload an image, PDF, or ZIM file",
        variant: "destructive",
      })
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    setSelectedFile(file)

    // Pre-fill manual fields with file data
    setManualFileName(file.name)
    setManualFileSize(file.size.toString())
    setManualFileType(file.type || `application/${file.name.split(".").pop()}`)
  }

  // Try all possible bucket names
  const tryUploadToBuckets = async (file: File, filePath: string, onProgress: (progress: number) => void) => {
    // List of buckets to try in order
    const bucketNames = ["site-files", "public", "files", "folder-files", "documents"]

    // Try each bucket
    for (const bucketName of bucketNames) {
      try {
        const { error } = await supabase.storage.from(bucketName).upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          onUploadProgress: (progress) => {
            onProgress(Math.round((progress.loaded / progress.total) * 100))
          },
        })

        if (!error) {
          // Success! Return the bucket name
          return { bucketName, error: null }
        }
      } catch (error) {
        console.log(`Failed to upload to bucket ${bucketName}:`, error)
        // Continue to next bucket
      }
    }

    // If we get here, all buckets failed
    return { bucketName: null, error: new Error("No available storage buckets found") }
  }

  const saveMetadataOnly = async () => {
    setUploading(true)

    try {
      // Get user session
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error("You must be logged in to record file information")
      }

      // Validate manual inputs if no file is selected
      if (!selectedFile) {
        if (!manualFileName.trim()) {
          throw new Error("File name is required")
        }

        if (!manualFileType.trim()) {
          throw new Error("File type is required")
        }

        const size = Number.parseInt(manualFileSize)
        if (isNaN(size) || size <= 0) {
          throw new Error("Valid file size is required")
        }
      }

      // Use either selected file data or manual inputs
      const fileName = selectedFile ? selectedFile.name : manualFileName.trim()
      const fileType = selectedFile ? selectedFile.type : manualFileType.trim()
      const fileSize = selectedFile ? selectedFile.size : Number.parseInt(manualFileSize)
      const fileExt = fileName.split(".").pop() || ""

      // Generate a placeholder path with special prefix to indicate metadata-only
      const filePath = `${METADATA_PREFIX}${folderId}/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`

      // Add file record to database
      const { error: dbError } = await supabase.from("folder_files").insert({
        folder_id: folderId,
        file_name: fileName,
        file_type: fileType || `application/${fileExt}`,
        file_size: fileSize,
        file_path: filePath, // Use the special prefix to indicate metadata-only
        uploaded_by: session.user.id,
        description: description.trim() || null,
      })

      if (dbError) {
        console.error("Database error:", dbError)
        throw dbError
      }

      toast({
        title: "File information saved",
        description: "The file information has been recorded successfully.",
      })

      // Reset form
      setSelectedFile(null)
      setDescription("")
      setManualFileName("")
      setManualFileSize("")
      setManualFileType("")
      if (fileInputRef.current) fileInputRef.current.value = ""

      // Notify parent component
      if (typeof onUploadComplete === "function") {
        onUploadComplete()
      }

      // Refresh the page
      router.refresh()
    } catch (error: any) {
      console.error("Error saving metadata:", error)
      toast({
        title: "Failed to save file information",
        description: error.message || "An error occurred while saving file information",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const uploadFile = async () => {
    if (metadataOnly) {
      return saveMetadataOnly()
    }

    if (!selectedFile) return

    setUploading(true)
    setProgress(0)
    setStorageError(null)

    try {
      // Get user session
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error("You must be logged in to upload files")
      }

      // Create a unique file name to prevent collisions
      const fileExt = selectedFile.name.split(".").pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = `folder_files/${folderId}/${fileName}`

      // Try to upload to any available bucket
      const { bucketName, error } = await tryUploadToBuckets(selectedFile, filePath, setProgress)

      if (error || !bucketName) {
        setStorageError("No storage buckets available. Please set up storage to enable file uploads.")
        setMetadataOnly(true)
        return
      }

      // Add file record to database
      const { error: dbError } = await supabase.from("folder_files").insert({
        folder_id: folderId,
        file_name: selectedFile.name,
        file_type: selectedFile.type || `application/${fileExt}`,
        file_size: selectedFile.size,
        file_path: filePath,
        uploaded_by: session.user.id,
        description: description.trim() || null,
      })

      if (dbError) {
        console.error("Database error:", dbError)
        throw dbError
      }

      toast({
        title: "Upload successful",
        description: "Your file has been uploaded successfully",
      })

      // Reset form
      setSelectedFile(null)
      setDescription("")
      if (fileInputRef.current) fileInputRef.current.value = ""

      // Notify parent component
      if (typeof onUploadComplete === "function") {
        onUploadComplete()
      }

      // Refresh the page
      router.refresh()
    } catch (error: any) {
      console.error("Upload error:", error)

      if (!storageError) {
        toast({
          title: "Upload failed",
          description: error.message || "An error occurred during upload",
          variant: "destructive",
        })
      }

      // Switch to metadata-only mode after upload failure
      setMetadataOnly(true)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          {metadataOnly ? "Record File Information" : "Upload File"}
        </CardTitle>
        <CardDescription>
          {metadataOnly
            ? "Record information about files without uploading them"
            : "Upload images, PDFs, or ZIM files to this folder"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {storageError && (
          <Alert variant="warning" className="bg-amber-50 border-amber-200">
            <Info className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-700">Storage Not Available</AlertTitle>
            <AlertDescription className="text-amber-700">
              <p className="mb-2">{storageError}</p>
              <div className="flex space-x-2 mt-2">
                {isAdmin && (
                  <Button variant="outline" size="sm" asChild className="flex items-center text-xs">
                    <Link href={`/sites/${folderType}/folders/${folderId}/storage-setup`}>
                      <Settings className="mr-1 h-3 w-3" />
                      Set Up Storage
                    </Link>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkStorageAvailability}
                  disabled={checkingStorage}
                  className="flex items-center text-xs"
                >
                  <RefreshCw className={`mr-1 h-3 w-3 ${checkingStorage ? "animate-spin" : ""}`} />
                  Refresh Status
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch id="metadata-mode" checked={metadataOnly} onCheckedChange={setMetadataOnly} />
            <Label htmlFor="metadata-mode">Metadata-only mode</Label>
          </div>
          {metadataOnly && (
            <div className="text-xs text-muted-foreground">
              Files won't be uploaded, only their information will be recorded
            </div>
          )}
        </div>

        {metadataOnly ? (
          <div className="space-y-4 border rounded-lg p-4">
            <div className="space-y-2">
              <Label htmlFor="file-name">File Name *</Label>
              <Input
                id="file-name"
                value={manualFileName}
                onChange={(e) => setManualFileName(e.target.value)}
                placeholder="example.pdf"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-type">File Type *</Label>
              <Input
                id="file-type"
                value={manualFileType}
                onChange={(e) => setManualFileType(e.target.value)}
                placeholder="application/pdf"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-size">File Size (bytes) *</Label>
              <Input
                id="file-size"
                type="number"
                value={manualFileSize}
                onChange={(e) => setManualFileSize(e.target.value)}
                placeholder="1024"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Enter a description for this file"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={uploading}
              />
            </div>

            <div className="text-xs text-muted-foreground">
              <p>* Required fields</p>
              <p className="mt-1">You can also select a file to auto-fill these fields</p>
            </div>
          </div>
        ) : !selectedFile ? (
          <div
            className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0]
                handleFileSelection(file)
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelection(e.target.files[0])
                }
              }}
              className="hidden"
              accept="image/*,.pdf,.zim,application/zim,application/x-zim,application/octet-stream"
            />
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-center">Click to select a file or drag and drop</p>
            <p className="text-xs text-muted-foreground mt-1">Max file size: 50MB</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className={`flex flex-col items-center p-4 rounded-lg ${
                uploading ? "border-2 border-green-500 bg-green-50/30 transition-all duration-300" : "border"
              }`}
            >
              {getFileIcon(selectedFile)}
              <p className="mt-2 font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setSelectedFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ""
                }}
                disabled={uploading}
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Enter a description for this file"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={uploading}
              />
            </div>

            {uploading && !metadataOnly && (
              <div className="space-y-2">
                <Progress value={progress} className="bg-green-100" indicatorClassName="bg-green-500" />
                <p className="text-xs text-center text-muted-foreground">Uploading... {progress}%</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            fileInputRef.current?.click()
          }}
          disabled={uploading}
        >
          Select File
        </Button>
        <Button
          onClick={uploadFile}
          disabled={(metadataOnly ? !manualFileName || !manualFileType || !manualFileSize : !selectedFile) || uploading}
        >
          {uploading
            ? metadataOnly
              ? "Saving..."
              : "Uploading..."
            : metadataOnly
              ? "Save Information"
              : "Upload File"}
        </Button>
      </CardFooter>
    </Card>
  )
}
