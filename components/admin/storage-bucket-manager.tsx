"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export function StorageBucketManager() {
  const [bucketName, setBucketName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [buckets, setBuckets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const loadBuckets = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.storage.listBuckets()
      if (error) throw error
      setBuckets(data || [])
    } catch (error: any) {
      console.error("Error loading buckets:", error)
      toast({
        title: "Error loading buckets",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createBucket = async () => {
    if (!bucketName.trim()) {
      toast({
        title: "Bucket name required",
        description: "Please enter a name for the bucket",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch("/api/storage/create-bucket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bucketName: bucketName.trim() }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create bucket")
      }

      toast({
        title: "Bucket created",
        description: `Storage bucket "${bucketName}" has been created successfully`,
      })

      setBucketName("")
      loadBuckets()
    } catch (error: any) {
      console.error("Error creating bucket:", error)
      toast({
        title: "Error creating bucket",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage Bucket Management</CardTitle>
        <CardDescription>Create and manage storage buckets for file uploads</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="bucket-name" className="text-sm font-medium mb-1 block">
              Bucket Name
            </label>
            <Input
              id="bucket-name"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              placeholder="Enter bucket name"
              disabled={isCreating}
            />
          </div>
          <Button onClick={createBucket} disabled={isCreating || !bucketName.trim()}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Bucket"
            )}
          </Button>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Existing Buckets</h3>
            <Button variant="outline" size="sm" onClick={loadBuckets} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Loading...
                </>
              ) : (
                "Refresh"
              )}
            </Button>
          </div>

          {buckets.length > 0 ? (
            <div className="border rounded-md">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left text-sm font-medium">Name</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Public</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.map((bucket) => (
                    <tr key={bucket.id} className="border-b last:border-0">
                      <td className="px-4 py-2 text-sm">{bucket.name}</td>
                      <td className="px-4 py-2 text-sm">{bucket.public ? "Yes" : "No"}</td>
                      <td className="px-4 py-2 text-sm">{new Date(bucket.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              {isLoading ? "Loading buckets..." : "No buckets found. Click 'Refresh' to load buckets."}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start">
        <p className="text-sm text-muted-foreground">
          Note: For file uploads to work, you need to create a bucket named "site-files" or "public".
        </p>
      </CardFooter>
    </Card>
  )
}
