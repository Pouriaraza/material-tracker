import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ReserveTrackerClient } from "@/components/reserve-tracker-client"
import { getReserveItems } from "@/lib/db-reserve"
import { checkIsAdmin } from "@/lib/auth-utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { FileText } from "lucide-react"

export default async function ReserveTrackerPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Check if user is admin
  const isAdmin = await checkIsAdmin()

  try {
    const items = await getReserveItems()

    return (
      <div className="container mx-auto py-4 px-4 sm:px-6 sm:py-6 max-w-full">
        {isAdmin && (
          <div className="mb-4 flex justify-end">
            <Button
              variant="outline"
              className="bg-purple-600 text-white hover:bg-purple-700 border-purple-600"
              asChild
            >
              <Link href="/reserve-tracker/permissions">
                <FileText className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Manage</span> Permissions
              </Link>
            </Button>
          </div>
        )}
        <ReserveTrackerClient initialItems={items} />
      </div>
    )
  } catch (error) {
    console.error("Error in ReserveTrackerPage:", error)
    return (
      <div className="container mx-auto py-4 px-4 sm:py-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error loading Reserve Tracker</p>
          <p>There was a problem loading your data. Please try again later.</p>
        </div>
      </div>
    )
  }
}
