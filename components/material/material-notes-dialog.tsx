"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Package, MapPin, Hash, Calendar } from "lucide-react"

interface Material {
  id: string
  name: string
  description: string
  notes: string
  part_number: string
  quantity: number
  unit: string
  location: string
  status: string
  created_at: string
  material_categories: {
    name: string
    color: string
  }
}

interface MaterialNotesDialogProps {
  materialId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onMaterialUpdated: () => void
}

export function MaterialNotesDialog({ materialId, open, onOpenChange, onMaterialUpdated }: MaterialNotesDialogProps) {
  const [material, setMaterial] = useState<Material | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (materialId && open) {
      fetchMaterial()
    }
  }, [materialId, open])

  const fetchMaterial = async () => {
    if (!materialId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/material/items/${materialId}`)
      if (response.ok) {
        const data = await response.json()
        setMaterial(data.material)
        setNotes(data.material.notes || "")
      }
    } catch (error) {
      console.error("Error fetching material:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!materialId) return

    setSaving(true)
    try {
      const response = await fetch(`/api/material/items/${materialId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...material,
          notes,
        }),
      })

      if (response.ok) {
        onMaterialUpdated()
        onOpenChange(false)
      }
    } catch (error) {
      console.error("Error saving notes:", error)
    } finally {
      setSaving(false)
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

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!material) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {material.name}
          </DialogTitle>
          <DialogDescription>Material details and notes</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Material Info */}
          <div className="grid gap-4">
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(material.status)} variant="secondary">
                {material.status.replace("_", " ").toUpperCase()}
              </Badge>
              <Badge
                style={{
                  backgroundColor: material.material_categories.color + "20",
                  color: material.material_categories.color,
                }}
                variant="secondary"
              >
                {material.material_categories.name}
              </Badge>
            </div>

            {material.part_number && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Hash className="h-4 w-4" />
                Part Number: {material.part_number}
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              Quantity: {material.quantity} {material.unit}
            </div>

            {material.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Location: {material.location}
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Created: {new Date(material.created_at).toLocaleDateString()}
            </div>
          </div>

          {material.description && (
            <>
              <Separator />
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-muted-foreground mt-1">{material.description}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Notes Section */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes, specifications, or any additional information..."
              rows={6}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveNotes} disabled={saving}>
            {saving ? "Saving..." : "Save Notes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
