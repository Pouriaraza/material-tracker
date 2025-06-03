"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { Users } from "lucide-react"

interface SheetPermissionsBadgeProps {
  sheetId: string
}

export function SheetPermissionsBadge({ sheetId }: SheetPermissionsBadgeProps) {
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadPermissionsCount = async () => {
      try {
        const { count, error } = await supabase
          .from("sheet_permissions")
          .select("*", { count: "exact", head: true })
          .eq("sheet_id", sheetId)

        if (error) {
          console.error("Error loading permissions count:", error)
          return
        }

        setCount(count || 0)
      } catch (err) {
        console.error("Error:", err)
      } finally {
        setLoading(false)
      }
    }

    loadPermissionsCount()
  }, [sheetId])

  if (loading || count === null || count === 0) {
    return null
  }

  return (
    <Badge variant="secondary" className="ml-2 flex items-center gap-1">
      <Users className="h-3 w-3" />
      <span>
        {count} {count === 1 ? "user" : "users"}
      </span>
    </Badge>
  )
}

export default SheetPermissionsBadge
