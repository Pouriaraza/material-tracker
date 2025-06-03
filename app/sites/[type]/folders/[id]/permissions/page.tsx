import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BackButton } from "@/components/ui/back-button"
import { Shield } from "lucide-react"
import FolderPermissionsManager from "@/components/sites/folder-permissions-manager"

interface FolderPermissionsPageProps {
  params: {
    type: string
    id: string
  }
}

export default async function FolderPermissionsPage({ params }: FolderPermissionsPageProps) {
  const { type, id } = params
  const supabase = createClient()

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    redirect("/login")
  }

  // Get folder details
  const { data: folder, error } = await supabase.from("site_folders").select("*").eq("id", id).single()

  if (error || !folder) {
    redirect(`/sites/${type}`)
  }

  // Check if user is admin
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", session.user.id)
    .maybeSingle()

  // Check if user is the folder creator
  const isCreator = folder.created_by === session.user.id
  const isAdmin = !!adminUser

  // STRICT: Only allow access if user is admin or folder creator
  if (!isAdmin && !isCreator) {
    redirect(`/sites/${type}/folders/${id}`)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <BackButton showHomeIcon={false} destination={`/sites/${type}/folders/${id}`} label="Back to Folder" />
        <h1 className="text-2xl font-bold">Permissions: {folder.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2 text-primary" />
            Manage Folder Permissions
          </CardTitle>
          <CardDescription>Control who can access, edit, and delete this folder</CardDescription>
        </CardHeader>
        <CardContent>
          <FolderPermissionsManager folderId={id} folderName={folder.name} siteType={type} />
        </CardContent>
      </Card>
    </div>
  )
}
