import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { FileUploader } from "@/components/sites/file-uploader"
import { FileList } from "@/components/sites/file-list"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Settings } from "lucide-react"

export default async function FolderPage({ params }: { params: { type: string; id: string } }) {
  const supabase = createClient()

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    redirect("/login")
  }

  // Get folder details
  const { data: folder, error } = await supabase.from("site_folders").select("*").eq("id", params.id).single()

  if (error || !folder) {
    redirect(`/sites/${params.type}`)
  }

  // Check if user is admin
  const { data: isAdmin } = await supabase.rpc("is_admin", {
    user_id: session.user.id,
  })

  // Check if storage is available
  const { data: buckets, error: storageError } = await supabase.storage.listBuckets()
  const storageAvailable = !storageError && buckets && buckets.length > 0

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/sites/${params.type}`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to {params.type.replace(/_/g, " ")}
            </Link>
          </Button>
        </div>

        {isAdmin && !storageAvailable && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/sites/${params.type}/folders/${params.id}/storage-setup`}>
              <Settings className="h-4 w-4 mr-1" />
              Storage Setup
            </Link>
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{folder.name}</h1>
        {folder.description && <p className="text-muted-foreground">{folder.description}</p>}
      </div>

      <FileUploader folderId={params.id} folderType={params.type} />

      <FileList folderId={params.id} />
    </div>
  )
}
