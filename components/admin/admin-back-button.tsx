"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export function AdminBackButton() {
  const router = useRouter()

  return (
    <Button variant="ghost" size="sm" onClick={() => router.push("/admin")} className="mr-4">
      <ChevronLeft className="h-4 w-4 mr-1" />
      Back
    </Button>
  )
}
