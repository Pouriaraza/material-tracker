"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertTriangle } from "lucide-react"

interface Material {
  id: string
  name: string
  description: string
  part_number: string
  quantity: number
  unit: string
  status: string
}

interface MaterialDeleteDialogProps {
  material: Material
  open: boolean
  onOpenChange: (open: boolean) => void
  onMaterialDeleted: () => void
}

export function MaterialDeleteDialog({ material, open, onOpenChange, onMaterialDeleted }: MaterialDeleteDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)

    try {
      const response = await fetch(`/api/material/items/${material.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        onMaterialDeleted()
        onOpenChange(false)
      } else {
        const error = await response.json()
        console.error("Error deleting material:", error)
      }
    } catch (error) {
      console.error("Error deleting material:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800"
      case "out_of_stock":
        return "bg-red-100 text-red-800"
      case "reserved":
        return "bg-yellow-100 text-yellow-800"
      case "discontinued":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Delete Material
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this material? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{material.name}</h4>
                <Badge className={getStatusColor(material.status)} variant="secondary">
                  {material.status.replace("_", " ")}
                </Badge>
              </div>
              {material.part_number && <p className="text-sm text-muted-foreground">Part: {material.part_number}</p>}
              <p className="text-sm text-muted-foreground">
                Quantity: {material.quantity} {material.unit}
              </p>
              {material.description && <p className="text-sm text-muted-foreground">{material.description}</p>}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Material
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
