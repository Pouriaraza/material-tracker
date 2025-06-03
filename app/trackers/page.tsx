import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserTrackers } from "@/lib/db-trackers"
import { TrackersClient } from "@/components/trackers-client"

export default async function TrackersPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  let trackers = []
  let error = null

  try {
    trackers = await getUserTrackers(session.user.id)
  } catch (err) {
    console.error("Error fetching trackers:", err)
    error = "Failed to load trackers. Please try again later."
  }

  return <TrackersClient trackers={trackers} error={error} />
}
