import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getTrackerById } from "@/lib/db-trackers"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { TrackerFormServer } from "@/components/tracker-form-server"
import { DeleteTrackerButton } from "@/components/delete-tracker-button"

export default async function EditTrackerPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  const tracker = await getTrackerById(params.id, session.user.id)

  if (!tracker) {
    notFound()
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href={`/trackers/${params.id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Edit Tracker</h1>
        </div>
        <DeleteTrackerButton trackerId={params.id} />
      </div>

      <div className="max-w-md mx-auto">
        <TrackerFormServer
          trackerId={params.id}
          initialTitle={tracker.title}
          initialDescription={tracker.description}
          initialType={tracker.type}
          initialTarget={tracker.target}
          initialUnit={tracker.unit}
          initialDate={new Date(tracker.startDate)}
        />
      </div>
    </div>
  )
}
