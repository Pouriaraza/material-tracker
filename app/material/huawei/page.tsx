"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, Edit, AlertCircle, ChevronDown, ChevronUp, Trash2, RefreshCw } from "lucide-react"
import { BackButton } from "@/components/ui/back-button"
import { CategoryDialog } from "@/components/material/category-dialog"
import { SimpleCategoryActions } from "@/components/material/simple-category-actions"
import { MaterialDialog } from "@/components/material/material-dialog"
import { MaterialEditDialog } from "@/components/material/material-edit-dialog"
import { MaterialDeleteDialog } from "@/components/material/material-delete-dialog"
import { MaterialNotesDialog } from "@/components/material/material-notes-dialog"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Category {
  id: string
  name: string
  description: string
  color: string
  created_at: string
}

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
  material_categories: {
    name: string
    color: string
  }
}

export default function HuaweiMaterialPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [materials, setMaterials] = useState<{ [categoryId: string]: Material[] }>({})
  const [loading, setLoading] = useState(true)
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null)
  const [notesDialogOpen, setNotesDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchCategories()
  }, [])

  const refreshSchema = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch("/api/material/refresh-schema", {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Schema refresh result:", data)
        // Refresh the page data
        await fetchCategories()
      } else {
        console.error("Schema refresh failed")
      }
    } catch (error) {
      console.error("Error refreshing schema:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const setupTables = async () => {
    setIsSettingUp(true)
    setSetupError(null)

    try {
      const response = await fetch("/api/setup-material-tables", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        setSetupError(null)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await fetchCategories()
      } else {
        setSetupError(data.error || "Failed to setup tables")
      }
    } catch (error) {
      console.error("Error setting up tables:", error)
      setSetupError("Failed to setup tables")
    } finally {
      setIsSettingUp(false)
    }
  }

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/material/categories?brand=huawei")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (response.ok) {
        setCategories(data.categories || [])
        setSetupError(null)

        for (const category of data.categories || []) {
          fetchMaterials(category.id)
        }
      } else {
        if (data.tableExists === false || data.error?.includes("does not exist")) {
          setSetupError("Database tables need to be created")
        } else {
          setSetupError(data.error || "Failed to fetch categories")
        }
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
      setSetupError("Failed to connect to database")
    } finally {
      setLoading(false)
    }
  }

  const fetchMaterials = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/material/items?category_id=${categoryId}`)

      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`)
        return
      }

      // Check if response is JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Response is not JSON:", await response.text())
        return
      }

      const data = await response.json()

      if (data.tableExists === false) {
        setSetupError("Database tables need to be created")
        return
      }

      setMaterials((prev) => ({
        ...prev,
        [categoryId]: data.materials || [],
      }))
    } catch (error) {
      console.error("Error fetching materials:", error)
      // Don't set setup error here, just log it
    }
  }

  const handleMaterialClick = (material: Material, e: React.MouseEvent) => {
    // Only open notes if not clicking on action buttons
    if ((e.target as HTMLElement).closest("button")) {
      return
    }
    setSelectedMaterial(material.id)
    setNotesDialogOpen(true)
  }

  const toggleCategoryCollapse = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
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

  const refreshMaterialsForCategory = (categoryId: string) => {
    fetchMaterials(categoryId)
  }

  if (setupError) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Package className="mr-3 h-8 w-8 text-red-600" />
              Huawei Materials
            </h1>
            <p className="text-muted-foreground mt-1">Manage Huawei equipment and materials inventory</p>
          </div>
        </div>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Database Setup Required</p>
                <p className="text-sm text-muted-foreground mt-1">{setupError}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={refreshSchema} disabled={isRefreshing} size="sm" variant="outline">
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                  {isRefreshing ? "Refreshing..." : "Refresh Schema"}
                </Button>
                <Button onClick={setupTables} disabled={isSettingUp} size="sm">
                  {isSettingUp ? "Setting up..." : "Setup Database"}
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <Card>
          <CardContent className="text-center py-8">
            <Package className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Material management system is not ready</p>
            <p className="text-sm text-muted-foreground">Try refreshing the schema or setting up the database</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Package className="mr-3 h-8 w-8 text-red-600" />
              Huawei Materials
            </h1>
            <p className="text-muted-foreground mt-1">Manage Huawei equipment and materials inventory</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <BackButton />
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center">
            <Package className="mr-3 h-8 w-8 text-red-600" />
            Huawei Materials
          </h1>
          <p className="text-muted-foreground mt-1">Manage Huawei equipment and materials inventory</p>
        </div>
        <Button onClick={refreshSchema} disabled={isRefreshing} size="sm" variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh Schema"}
        </Button>
        <CategoryDialog brand="huawei" onCategoryCreated={fetchCategories} />
      </div>

      <div className="grid gap-4">
        {categories.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Package className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No categories created yet</p>
              <p className="text-sm text-muted-foreground">Create your first category to start organizing materials</p>
            </CardContent>
          </Card>
        ) : (
          categories.map((category) => {
            const isCollapsed = collapsedCategories.has(category.id)
            const categoryMaterials = materials[category.id] || []

            return (
              <Card key={category.id} className="hover:shadow-lg transition-shadow">
                <CardHeader
                  className="pb-3"
                  style={{ backgroundColor: category.color + "10", borderBottom: `2px solid ${category.color}` }}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-3 cursor-pointer flex-1"
                      onClick={() => toggleCategoryCollapse(category.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {categoryMaterials.length}
                        </Badge>
                      </div>
                      {isCollapsed ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <MaterialDialog
                        brand="huawei"
                        categoryId={category.id}
                        categoryName={category.name}
                        onMaterialCreated={() => fetchMaterials(category.id)}
                      />
                      <SimpleCategoryActions category={category} onCategoryDeleted={fetchCategories} />
                    </div>
                  </div>
                  {category.description && !isCollapsed && (
                    <CardDescription className="mt-1">{category.description}</CardDescription>
                  )}
                </CardHeader>
                {!isCollapsed && (
                  <CardContent className="pt-4">
                    {categoryMaterials.length > 0 ? (
                      <div className="grid gap-3">
                        {categoryMaterials.map((material) => (
                          <div
                            key={material.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                            onClick={(e) => handleMaterialClick(material, e)}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{material.name}</h4>
                                <Badge className={getStatusColor(material.status)} variant="secondary">
                                  {material.status.replace("_", " ")}
                                </Badge>
                              </div>
                              {material.part_number && (
                                <p className="text-sm text-muted-foreground">Part: {material.part_number}</p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                Qty: {material.quantity} {material.unit}
                                {material.location && ` • Location: ${material.location}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingMaterial(material)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeletingMaterial(material)
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <Package className="mx-auto h-8 w-8 mb-2" />
                        <p>No materials in this category</p>
                        <p className="text-sm">Add materials to get started</p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>

      <MaterialNotesDialog
        materialId={selectedMaterial}
        open={notesDialogOpen}
        onOpenChange={setNotesDialogOpen}
        onMaterialUpdated={() => {
          if (selectedMaterial) {
            Object.keys(materials).forEach((categoryId) => {
              if (materials[categoryId].some((m) => m.id === selectedMaterial)) {
                fetchMaterials(categoryId)
              }
            })
          }
        }}
      />

      {editingMaterial && (
        <MaterialEditDialog
          material={editingMaterial}
          open={!!editingMaterial}
          onOpenChange={(open) => !open && setEditingMaterial(null)}
          onMaterialUpdated={() => {
            // Find which category this material belongs to and refresh it
            Object.keys(materials).forEach((categoryId) => {
              if (materials[categoryId].some((m) => m.id === editingMaterial.id)) {
                fetchMaterials(categoryId)
              }
            })
          }}
        />
      )}

      {deletingMaterial && (
        <MaterialDeleteDialog
          material={deletingMaterial}
          open={!!deletingMaterial}
          onOpenChange={(open) => !open && setDeletingMaterial(null)}
          onMaterialDeleted={() => {
            // Find which category this material belongs to and refresh it
            Object.keys(materials).forEach((categoryId) => {
              if (materials[categoryId].some((m) => m.id === deletingMaterial.id)) {
                fetchMaterials(categoryId)
              }
            })
          }}
        />
      )}
    </div>
  )
}
