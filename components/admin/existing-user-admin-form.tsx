"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export function ExistingUserAdminForm() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [foundUser, setFoundUser] = useState<{ id: string; email: string } | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const searchUser = async () => {
    if (!email) return

    setIsSearching(true)
    setError(null)
    setFoundUser(null)

    try {
      // First, check if the user has a profile in the profiles table
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", email)
        .maybeSingle()

      if (profileData) {
        setFoundUser({ id: profileData.id, email: profileData.email })
        return
      }

      // If not found in profiles, check if they have any entries in user_roles
      const { data: userRolesData, error: userRolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("user_id", email) // Try using email as ID (unlikely but possible)
        .maybeSingle()

      if (userRolesData) {
        setFoundUser({ id: userRolesData.user_id, email })
        return
      }

      // If we still haven't found the user, check the current session
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session && session.user.email === email) {
        setFoundUser({ id: session.user.id, email })
        return
      }

      setError("User not found. They need to sign in at least once before you can make them an admin.")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!foundUser) {
      await searchUser()
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/admin/set-existing-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: foundUser.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong")
      }

      setSuccess(data.message)

      // Redirect after a delay if successful
      setTimeout(() => {
        router.push("/admin/users")
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Set Existing User as Admin</CardTitle>
        <CardDescription>
          Find an existing user by email and make them an admin. The user must have signed in at least once.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-500 text-green-500">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="existing-email">Email</Label>
              <div className="flex gap-2">
                <Input
                  id="existing-email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading || isSearching || !!foundUser || !!success}
                  className="flex-1"
                />
                {!foundUser && (
                  <Button type="button" onClick={searchUser} disabled={isSearching || !email || !!foundUser}>
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                  </Button>
                )}
              </div>
            </div>

            {foundUser && (
              <Alert className="border-green-500">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>User Found</AlertTitle>
                <AlertDescription>
                  User with email {foundUser.email} found. Click the button below to make them an admin.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleSubmit}
          disabled={isLoading || isSearching || !email || !foundUser || !!success}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting up...
            </>
          ) : (
            "Set as Admin"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
