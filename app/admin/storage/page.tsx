import { StorageBucketManager } from "@/components/admin/storage-bucket-manager"
import { AdminBackButton } from "@/components/admin/admin-back-button"

export default function StorageManagementPage() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Storage Management</h1>
        <AdminBackButton />
      </div>

      <p className="text-muted-foreground">
        Manage storage buckets for file uploads. For the file uploader to work properly, you need to create a bucket
        named "site-files" or ensure the "public" bucket exists.
      </p>

      <StorageBucketManager />
    </div>
  )
}
