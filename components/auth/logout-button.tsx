"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface LogoutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  quickAction?: boolean
}

export function LogoutButton({
  variant = "outline",
  size = "default",
  className = "",
  quickAction = false,
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    try {
      setIsLoading(true)
      await supabase.auth.signOut()
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Error logging out:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (quickAction) {
    return (
      <Button
        onClick={handleLogout}
        disabled={isLoading}
        variant="outline"
        className="flex h-20 w-full flex-col items-center justify-center gap-1 p-2 border-red-200 hover:bg-red-50 hover:text-red-600"
      >
        <div className="rounded-full bg-red-100 p-2">
          <LogOut className="h-4 w-4 text-red-600" />
        </div>
        <span className="text-xs font-medium">{isLoading ? "Logging out..." : "Log Out"}</span>
      </Button>
    )
  }

  return (
    <Button onClick={handleLogout} disabled={isLoading} variant={variant} size={size} className={className}>
      {isLoading ? (
        "Logging out..."
      ) : (
        <>
          <LogOut className="mr-2 h-4 w-4" />
          Log Out
        </>
      )}
    </Button>
  )
}
