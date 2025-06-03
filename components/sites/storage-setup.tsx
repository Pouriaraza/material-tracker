"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useRouter } from "next/navigation"

export function StorageSetup({ onSetupComplete }: { onSetupComplete?: () => void }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [storageAvailable, setStorageAvailable] = useState(false)
  const [buckets, setBuckets] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [apiResponse, setApiResponse] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkStorageStatus()
  }, [])

  const checkStorageStatus = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // First try the API endpoint
      const response = await fetch("/api/storage/check-storage")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to check storage status")
      }

      setStorageAvailable(data.available)
      setBuckets(data.buckets.map((bucket: any) => bucket.name))

      // If API fails, fall back to client-side check
      if (!data.available) {
        // Double-check with client-side
        const { data: bucketsData, error: bucketsError } = await supabase.storage.listBuckets()

        if (bucketsError) {
          console.error("Client-side storage error:", bucketsError)
          setError(bucketsError.message)
          setStorageAvailable(false)
          return
        }

        if (bucketsData && bucketsData.length > 0) {
          setStorageAvailable(true)
          setBuckets(bucketsData.map((bucket) => bucket.name))
        }
      }
    } catch (err: any) {
      console.error("Error checking storage:", err)
      setError(err.message)

      // Fall back to client-side check
      try {
        const { data, error } = await supabase.storage.listBuckets()

        if (error) {
          console.error("Client-side storage error:", error)
          setError(error.message)
          setStorageAvailable(false)
          return
        }

        if (data && data.length > 0) {
          setStorageAvailable(true)
          setBuckets(data.map((bucket) => bucket.name))
        } else {
          setStorageAvailable(false)
          setBuckets([])
        }
      } catch (clientErr: any) {
        console.error("Client-side error checking storage:", clientErr)
        setError(clientErr.message)
        setStorageAvailable(false)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const createDefaultBucket = async () => {
    setIsCreating(true)
    setError(null)
    setApiResponse(null)

    try {
      const response = await fetch("/api/storage/create-default-bucket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      // Save the full API response for debugging
      setApiResponse(JSON.stringify(data, null, 2))

      if (!response.ok) {
        throw new Error(data.error || "Failed to create storage bucket")
      }

      toast({
        title: "Storage bucket created",
        description: "The storage bucket has been created successfully. You can now upload files.",
      })

      // Refresh storage status
      await checkStorageStatus()

      // Refresh the page to update UI
      router.refresh()

      // Notify parent component
      if (typeof onSetupComplete === "function") {
        onSetupComplete()
      }
    } catch (error: any) {
      console.error("Error creating bucket:", error)
      setError(error.message || "An error occurred while creating the storage bucket")
      toast({
        title: "Failed to create bucket",
        description: error.message || "An error occurred while creating the storage bucket",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleRetry = () => {
    checkStorageStatus()
  }

  return (
    <Card className="border-blue-200">
      <CardHeader className="bg-blue-50">
        <CardTitle>Storage Setup</CardTitle>
        <CardDescription>Set up storage to enable file uploads</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2">Checking storage status...</span>
          </div>
        ) : storageAvailable ? (
          <Alert variant="success" className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-700">Storage is available</AlertTitle>
            <AlertDescription className="text-green-700">
              <p>You have the following storage buckets:</p>
              <ul className="list-disc list-inside mt-2">
                {buckets.map((bucket) => (
                  <li key={bucket}>{bucket}</li>
                ))}
              </ul>
              <p className="mt-2">You can now upload files to your folders.</p>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert variant="warning" className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-amber-700">Storage is not available</AlertTitle>
              <AlertDescription className="text-amber-700">
                <p>No storage buckets found. You need to create a storage bucket to enable file uploads.</p>
                {error && <p className="mt-2 text-sm font-mono bg-amber-100 p-2 rounded">Error: {error}</p>}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col items-center justify-center py-4">
              <p className="text-center mb-4">
                Click the button below to create a default storage bucket for file uploads.
              </p>
              <div className="flex space-x-2">
                <Button
                  size="lg"
                  onClick={createDefaultBucket}
                  disabled={isCreating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Storage Bucket...
                    </>
                  ) : (
                    "Create Storage Bucket"
                  )}
                </Button>
                <Button size="lg" variant="outline" onClick={handleRetry} disabled={isLoading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh Status
                </Button>
              </div>
            </div>

            {apiResponse && (
              <div className="mt-4 p-4 bg-gray-100 rounded-md">
                <p className="font-semibold mb-2">API Response (Debug):</p>
                <pre className="text-xs overflow-auto max-h-40">{apiResponse}</pre>
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="bg-blue-50/50 border-t border-blue-100">
        <div className="text-sm text-muted-foreground">
          {storageAvailable
            ? "If you encounter any issues with file uploads, try refreshing the page."
            : "You must have admin privileges to create storage buckets."}
        </div>
      </CardFooter>
    </Card>
  )
}
