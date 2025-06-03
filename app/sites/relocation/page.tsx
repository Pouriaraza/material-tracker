import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowUpDown } from "lucide-react"
import { FolderManagement } from "@/components/sites/folder-management"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { checkIsAdmin } from "@/lib/auth-utils"

export default async function RelocationPage() {
  const supabase = createClient()

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    redirect("/login")
  }

  const user = session.user
  const isAdmin = await checkIsAdmin(user.id)

  return (
    <div className="container mx-auto py-6">
      <div className="mb-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/sites" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Sites
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Relocation</h1>
        </div>
        <p className="text-muted-foreground">Manage site relocation projects</p>
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Relocation Folders</h2>
        <p className="mb-6">
          Create and manage folders for site relocation projects. Admins can set permissions for users.
        </p>

        <FolderManagement category="relocation" categoryName="Relocation" currentUser={user} isAdmin={isAdmin} />
      </div>
    </div>
  )
}
