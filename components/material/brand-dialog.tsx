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
import { Plus, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BrandDialogProps {
  onBrandCreated?: () => void
}

const PRESET_COLORS = [
  "#3B82F6", // Blue
  "#DC2626", // Red
  "#059669", // Green
  "#7C3AED", // Purple
  "#EA580C", // Orange
  "#0891B2", // Cyan
  "#BE185D", // Pink
  "#374151", // Gray
]

export function BrandDialog({ onBrandCreated }: BrandDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
  })
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/material/brands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: `Brand "${formData.name}" created successfully!`,
        })
        setFormData({ name: "", description: "", color: "#3B82F6" })
        setOpen(false)

        // Wait a moment before refreshing to ensure the database has updated
        setTimeout(() => {
          if (onBrandCreated) {
            onBrandCreated()
          }
        }, 500)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create brand",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating brand:", error)
      toast({
        title: "Error",
        description: "Failed to create brand",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <Plus className="mr-2 h-4 w-4" />
          Create New Brand
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Material Brand</DialogTitle>
          <DialogDescription>Add a new brand to organize your materials and equipment.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Brand Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Nokia, ZTE, Samsung"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the brand..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Brand Color</Label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? "border-gray-900" : "border-gray-300"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-20 h-10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Brand
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
