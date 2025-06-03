"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, UserCog } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface UserProfileProps {
  user: any
  isAdmin: boolean
}

export function UserProfile({ user, isAdmin }: UserProfileProps) {
  const [name, setName] = useState(user.user_metadata?.name || "")
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleUpdateProfile = async () => {
    setIsUpdating(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name },
      })

      if (error) throw error

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      })

      router.refresh()
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error updating profile",
        description: "There was a problem updating your profile.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            User Profile
            {isAdmin && <Badge className="bg-green-500">Admin</Badge>}
          </CardTitle>
          <CardDescription>View and update your profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1">
            <p className="text-sm font-medium">Email</p>
            <p>{user.email}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">User ID</p>
            <p className="text-sm font-mono bg-muted p-2 rounded">{user.id}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Name</p>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Last Sign In</p>
            <p>{formatDate(user.last_sign_in_at)}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Account Created</p>
            <p>{formatDate(user.created_at)}</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button onClick={handleUpdateProfile} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
              </>
            ) : (
              "Update Profile"
            )}
          </Button>

          {isAdmin && (
            <Button variant="outline" asChild>
              <Link href="/admin/users">
                <UserCog className="mr-2 h-4 w-4" />
                Manage Users
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
