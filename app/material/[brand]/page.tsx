"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Trash2, Edit, Wrench } from "lucide-react"
import { BackButton } from "@/components/ui/back-button"
import { CategoryDialog } from "@/components/material/category-dialog"
import { MaterialDialog } from "@/components/material/material-dialog"
import { MaterialEditDialog } from "@/components/material/material-edit-dialog"
import { MaterialDeleteDialog } from "@/components/material/material-delete-dialog"
import { MaterialNotesDialog } from "@/components/material/material-notes-dialog"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

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

interface Brand {
  id: string
  name: string
  slug: string
  description: string
  color: string
}

export default function BrandMaterialPage() {
  const params = useParams()
  const router = useRouter()
  const brandSlug = params.brand as string
  const { toast } = useToast()

  const [brand, setBrand] = useState<Brand | null>(null)
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
  const [isFixingBrand, setIsFixingBrand] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [brandColumnMissing, setBrandColumnMissing] = useState(false)

  useEffect(() => {
    fetchBrand()
    fetchCategories()
  }, [brandSlug])

  const fetchBrand = async () => {
    try {
      const response = await fetch("/api/material/brands")
      const data = await response.json()

      if (data.brands) {
        const foundBrand = data.brands.find((b: Brand) => b.slug === brandSlug)
        setBrand(foundBrand || null)
      }
    } catch (error) {
      console.error("Error fetching brand:", error)
    }
  }

  const addBrandColumn = async () => {
    setIsFixingBrand(true)
    try {
      const response = await fetch("/api/material/add-brand-column", {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "Brand column added",
          description: "Brand column has been added to materials table",
        })
        setBrandColumnMissing(false)
        await refreshSchema()
        await fetchCategories()
      } else {
        const data = await response.json()
        toast({
          title: "Failed to add brand column",
          description: data.error || "Failed to add brand column to materials table",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding brand column:", error)
      toast({
        title: "Error",
        description: "Failed to add brand column",
        variant: "destructive",
      })
    } finally {
      setIsFixingBrand(false)
    }
  }

  const refreshSchema = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch("/api/material/refresh-schema", {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "Schema refreshed",
          description: "Database schema has been refreshed successfully",
        })
        await fetchCategories()
      } else {
        toast({
          title: "Schema refresh failed",
          description: "Failed to refresh database schema",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error refreshing schema:", error)
      toast({
        title: "Error",
        description: "Failed to refresh schema",
        variant: "destructive",
      })
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
        toast({
          title: "Tables created",
          description: "Material tables have been created successfully",
        })
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await fetchCategories()
      } else {
        setSetupError(data.error || "Failed to setup tables")
        toast({
          title: "Setup failed",
          description: data.error || "Failed to setup material tables",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error setting up tables:", error)
      setSetupError("Failed to setup tables")
      toast({
        title: "Error",
        description: "Failed to setup material tables",
        variant: "destructive",
      })
    } finally {
      setIsSettingUp(false)
    }
  }

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/material/categories?brand=${brandSlug}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (response.ok) {
        setCategories(data.categories || [])
        setSetupError(null)

        // Clear existing materials
        setMaterials({})

        // Fetch materials for each category
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
      console.log(`Fetching materials for category ${categoryId} and brand ${brandSlug}`)
      const response = await fetch(`/api/material/items?category_id=${categoryId}&brand=${brandSlug}`)

      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`)
        return
      }

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

      // Check if there's a brand column error
      if (data.error && data.error.includes("column materials.brand does not exist")) {
        setBrandColumnMissing(true)
        return
      }

      console.log(`Received ${data.materials?.length || 0} materials for category ${categoryId}`)

      setMaterials((prev) => ({
        ...prev,
        [categoryId]: data.materials || [],
      }))
    } catch (error) {
      console.error("Error fetching materials:", error)

      // Check if it's a brand column error
      if (error instanceof Error && error.message.includes("column materials.brand does not exist")) {
        setBrandColumnMissing(true)
      }
    }
  }

  const handleMaterialClick = (material: Material, e: React.MouseEvent) => {
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

  const handleMaterialCreated = (categoryId?: string) => {
    if (categoryId) {
      // Refresh just this category's materials
      fetchMaterials(categoryId)
    } else {
      // Refresh all categories' materials
      categories.forEach((category) => fetchMaterials(category.id))
    }

    toast({
      title: "Material added",
      description: "New material has been added successfully",
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!brand) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold">Brand Not Found</h1>
            <p className="text-muted-foreground mt-1">The requested brand does not exist</p>
          </div>
        </div>
      </div>
    )
  }

  if (brandColumnMissing) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Package className="mr-3 h-8 w-8" style={{ color: brand.color }} />
              {brand.name} Materials
            </h1>
            <p className="text-muted-foreground mt-1">Manage {brand.name} equipment and materials inventory</p>
          </div>
        </div>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Database Update Required</p>
                <p className="text-sm text-muted-foreground mt-1">
                  The materials table is missing the brand column. Click the button to add it.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={addBrandColumn}
                  disabled={isFixingBrand}
                  size="sm"
                  style={{ backgroundColor: brand.color, borderColor: brand.color }}
                >
                  <Wrench className={`h-4 w-4 mr-2 ${isFixingBrand ? "animate-spin" : ""}`} />
                  {isFixingBrand ? "Adding Column..." : "Add Brand Column"}
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <Card>
          <CardContent className="text-center py-8">
            <Package className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Material management system needs an update</p>
            <p className="text-sm text-muted-foreground">Click the "Add Brand Column" button to update the database</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (setupError) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Package className="mr-3 h-8 w-8" style={{ color: brand.color }} />
              {brand.name} Materials
            </h1>
            <p className="text-muted-foreground mt-1">Manage {brand.name} equipment and materials inventory</p>
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
                <Button
                  onClick={refreshSchema}
                  disabled={isRefreshing}
                  size="sm"
                  variant="outline"
                  style={{ borderColor: brand.color, color: brand.color }}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                  {isRefreshing ? "Refreshing..." : "Refresh Schema"}
                </Button>
                <Button
                  onClick={setupTables}
                  disabled={isSettingUp}
                  size="sm"
                  style={{ backgroundColor: brand.color, borderColor: brand.color }}
                >
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

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <BackButton />
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center">
            <Package className="mr-3 h-8 w-8" style={{ color: brand.color }} />
            {brand.name} Materials
          </h1>
          <p className="text-muted-foreground mt-1">Manage {brand.name} equipment and materials inventory</p>
        </div>
        <Button
          onClick={refreshSchema}
          disabled={isRefreshing}
          size="sm"
          variant="outline"
          style={{ borderColor: brand.color, color: brand.color }}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh Schema"}
        </Button>
        <CategoryDialog brand={brandSlug} brandColor={brand.color} onCategoryCreated={fetchCategories} />
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
                  style={{ backgroundColor: brand.color + "10", borderBottom: `2px solid ${brand.color}` }}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-3 cursor-pointer flex-1"
                      onClick={() => toggleCategoryCollapse(category.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{
                            backgroundColor: brand.color + "20",
                            color: brand.color,
                            borderColor: brand.color + "40",
                          }}
                        >
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
                        brand={brandSlug}
                        brandColor={brand.color}
                        categoryId={category.id}
                        categoryName={category.name}
                        onMaterialCreated={() => handleMaterialCreated(category.id)}
                      />
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
                                className="hover:bg-opacity-10"
                                style={
                                  {
                                    "--hover-bg": brand.color + "10",
                                  } as React.CSSProperties
                                }
                              >
                                <Edit className="h-4 w-4" style={{ color: brand.color }} />
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
