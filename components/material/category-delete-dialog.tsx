"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle } from "lucide-react"

interface CategoryDeleteDialogProps {
  category: {
    id: string
    name: string
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onCategoryDeleted: () => void
}

export function CategoryDeleteDialog({ category, open, onOpenChange, onCategoryDeleted }: CategoryDeleteDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("Deleting category:", category.id)

      const response = await fetch(`/api/material/categories/${category.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok) {
        console.log("Category deleted successfully")
        onOpenChange(false)
        onCategoryDeleted()
      } else {
        console.error("Error deleting category:", data.error)
        setError(data.error || "Failed to delete category")
      }
    } catch (error) {
      console.error("Error deleting category:", error)
      setError("Failed to delete category")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Category
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the category <strong>"{category.name}"</strong>?
            <br />
            <br />
            This action cannot be undone and will also delete all materials in this category.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
