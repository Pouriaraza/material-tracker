import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Home } from "lucide-react"

interface BackButtonProps {
  href?: string
  destination?: string
  label?: string
  showHomeIcon?: boolean
}

export function BackButton({ href, destination, label = "Back", showHomeIcon = true }: BackButtonProps) {
  const path = href || destination || "/home"

  return (
    <Button asChild variant="outline" size="sm">
      <Link href={path} className="flex items-center gap-2">
        {showHomeIcon ? <Home className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        {label}
      </Link>
    </Button>
  )
}
