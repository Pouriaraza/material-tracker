import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { StorageSetup } from "@/components/sites/storage-setup"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function StorageSetupPage({ params }: { params: { type: string; id: string } }) {
  const supabase = createClient()

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    redirect("/login")
  }

  // Check if user is admin
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin", {
    user_id: session.user.id,
  })

  if (adminError || !isAdmin) {
    redirect(`/sites/${params.type}/folders/${params.id}`)
  }

  // Get folder details for breadcrumb
  const { data: folder } = await supabase.from("site_folders").select("name").eq("id", params.id).single()

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/sites/${params.type}/folders/${params.id}`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Folder
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Storage Setup</h1>
        <p className="text-muted-foreground">
          Set up storage for {folder?.name || "this folder"} to enable file uploads
        </p>
      </div>

      <StorageSetup />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">Why do I need to set up storage?</h3>
        <p className="text-blue-700 text-sm">
          File uploads require a storage bucket to store the actual files. This is a one-time setup that enables file
          uploads across the entire application. Once set up, all users will be able to upload files to folders.
        </p>
      </div>
    </div>
  )
}
