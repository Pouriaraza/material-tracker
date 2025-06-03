import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TrackerFormServer } from "@/components/tracker-form-server"

export default async function NewTrackerPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Get type from query params
  const type = searchParams.type as "habit" | "goal" | undefined

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6">Create New Tracker</h1>
        <TrackerFormServer initialType={type} />
      </div>
    </div>
  )
}
