import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getTrackerById } from "@/lib/db-trackers"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { TrackerLogFormServer } from "@/components/tracker-log-form-server"

export default async function LogProgressPage({ params }: { params: { id: string } }) {
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
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href={`/trackers/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Log Progress</h1>
      </div>

      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">{tracker.title}</h2>
          <p className="text-muted-foreground">
            Current progress: {tracker.progress} / {tracker.target} {tracker.unit}
          </p>
        </div>

        <TrackerLogFormServer trackerId={params.id} unit={tracker.unit} />
      </div>
    </div>
  )
}
