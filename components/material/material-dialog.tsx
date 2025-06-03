"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Category {
  id: string
  name: string
  description?: string
  color?: string
}

interface MaterialDialogProps {
  brand: string
  brandColor?: string
  categories?: Category[]
  categoryId?: string
  categoryName?: string
  onMaterialCreated?: () => void
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  buttonSize?: "default" | "sm" | "lg" | "icon"
  className?: string
  children?: React.ReactNode
}

export function MaterialDialog({
  brand,
  brandColor = "#3B82F6",
  categories = [],
  categoryId,
  categoryName,
  onMaterialCreated,
  buttonVariant = "outline",
  buttonSize = "sm",
  className = "",
  children,
}: MaterialDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    notes: "",
    part_number: "",
    category_id: categoryId || "",
    quantity: 0,
    unit: "pcs",
    location: "",
    status: "available",
  })
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Make sure we have a category selected
      if (!formData.category_id) {
        toast({
          title: "Category required",
          description: "Please select a category for this material",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const response = await fetch("/api/material/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          brand,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Material created",
          description: `${formData.name} has been added successfully`,
        })

        setFormData({
          name: "",
          description: "",
          notes: "",
          part_number: "",
          category_id: categoryId || "",
          quantity: 0,
          unit: "pcs",
          location: "",
          status: "available",
        })

        setOpen(false)

        // Ensure we call the callback after a short delay to allow the database to update
        setTimeout(() => {
          if (onMaterialCreated) {
            onMaterialCreated()
          }
        }, 500)
      } else {
        toast({
          title: "Error creating material",
          description: data.error || "Failed to create material",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating material:", error)
      toast({
        title: "Error",
        description: "Failed to create material",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant={buttonVariant}
            size={buttonSize}
            className={className}
            style={{
              borderColor: brandColor,
              color: brandColor,
              backgroundColor: buttonVariant === "default" ? brandColor : "transparent",
            }}
          >
            {children || (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Material
              </>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Add New Material</DialogTitle>
              <DialogDescription>
                Add a new material to the {categoryName ? `"${categoryName}"` : "selected"} category.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              {!categoryId && categories.length > 0 && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category_id" className="text-right">
                    Category *
                  </Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="part_number" className="text-right">
                  Part Number
                </Label>
                <Input
                  id="part_number"
                  value={formData.part_number}
                  onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="col-span-3"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="col-span-3"
                  rows={3}
                  placeholder="Add any additional notes or specifications..."
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">
                  Quantity
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number.parseInt(e.target.value) || 0 })}
                  className="col-span-1"
                  min="0"
                />
                <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                  <SelectTrigger className="col-span-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Pieces</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="m">Meters</SelectItem>
                    <SelectItem value="box">Boxes</SelectItem>
                    <SelectItem value="set">Sets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location" className="text-right">
                  Location
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="col-span-3"
                  placeholder="Warehouse, shelf, etc."
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="discontinued">Discontinued</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} style={{ backgroundColor: brandColor, borderColor: brandColor }}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Adding..." : "Add Material"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
