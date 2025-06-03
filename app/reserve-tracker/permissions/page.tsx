import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BackButton } from "@/components/ui/back-button"
import TrackerPermissionsManager from "@/components/tracker-permissions-manager"
import { checkIsAdmin } from "@/lib/auth-utils"

export default async function ReserveTrackerPermissionsPage() {
  const supabase = createClient()

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    redirect("/login")
  }

  // Check if user is admin
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    redirect("/reserve-tracker")
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <BackButton showHomeIcon={false} destination="/reserve-tracker" label="Back to Reserve Tracker" />
        <h1 className="text-2xl font-bold">Manage Permissions: Reserve Tracker</h1>
      </div>

      <TrackerPermissionsManager trackerType="reserve" trackerName="Reserve Tracker" />
    </div>
  )
}
