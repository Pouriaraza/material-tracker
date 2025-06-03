"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Edit, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface SimpleCategoryActionsProps {
  category: {
    id: string
    name: string
  }
  onCategoryDeleted: () => void
}

export function SimpleCategoryActions({ category, onCategoryDeleted }: SimpleCategoryActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)

    try {
      console.log("Deleting category:", category.id)

      const response = await fetch(`/api/material/categories/${category.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("Response status:", response.status)

      if (response.ok) {
        console.log("Delete successful")
        setShowDeleteDialog(false)
        onCategoryDeleted()
      } else if (response.status === 404) {
        console.log("Category already deleted")
        setShowDeleteDialog(false)
        onCategoryDeleted() // Refresh the list anyway
      } else {
        const errorData = await response.text()
        console.error("Delete failed:", errorData)
        alert("Failed to delete: " + errorData)
      }
    } catch (error) {
      console.error("Delete error:", error)
      alert("Error: " + error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm">
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDeleteDialog(true)}
        className="text-red-600 hover:text-red-700"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{category.name}"? This will also delete all materials in this category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700">
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
