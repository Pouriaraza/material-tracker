"use client"

import type React from "react"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"
import { Upload, X, FileText, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface DocumentUploadProps {
  folderId: string
  onUploadComplete: () => void
}

export function DocumentUpload({ folderId, onUploadComplete }: DocumentUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Maximum file size (10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const files = Array.from(e.target.files || [])

    // Check file size
    const oversizedFiles = files.filter((file) => file.size > MAX_FILE_SIZE)
    if (oversizedFiles.length > 0) {
      setError(`Some files exceed the maximum size of 10MB: ${oversizedFiles.map((f) => f.name).join(", ")}`)
      return
    }

    setSelectedFiles(files)
  }

  // Handle file upload
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      // Get user session
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error("You must be logged in to upload files")
      }

      const userId = session.user.id

      // Process each file
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        const fileExt = file.name.split(".").pop()
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
        const filePath = `folder_documents/${folderId}/${fileName}`

        // Upload file to Supabase Storage
        const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        })

        if (uploadError) {
          throw uploadError
        }

        // Get public URL for the file
        const {
          data: { publicUrl },
        } = supabase.storage.from("documents").getPublicUrl(filePath)

        // Add record to the database
        const { error: dbError } = await supabase.from("folder_documents").insert({
          folder_id: folderId,
          name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: userId,
        })

        if (dbError) {
          throw dbError
        }

        // Update progress
        setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100))
      }

      // Reset state after successful upload
      setSelectedFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${selectedFiles.length} file(s)`,
      })

      // Notify parent component
      onUploadComplete()
    } catch (err: any) {
      console.error("Upload error:", err)
      setError(err.message || "An error occurred during upload")
      toast({
        title: "Upload Failed",
        description: err.message || "Failed to upload files",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  // Remove a file from the selection
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center ${
          selectedFiles.length > 0 ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        }`}
      >
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />

        {selectedFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-2">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Drag and drop files here or click to browse</p>
            <Button variant="outline" onClick={triggerFileInput}>
              Select Files
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Maximum file size: 10MB</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-background p-2 rounded-md">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeFile(index)} disabled={uploading}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {uploading ? (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-xs text-center text-muted-foreground">Uploading... {uploadProgress}%</p>
              </div>
            ) : (
              <div className="flex justify-between">
                <Button variant="outline" onClick={triggerFileInput}>
                  Add More Files
                </Button>
                <Button onClick={handleUpload}>
                  Upload {selectedFiles.length} {selectedFiles.length === 1 ? "File" : "Files"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
