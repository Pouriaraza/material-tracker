"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Package, ArrowLeft } from "lucide-react"
import { CategoryDialog } from "@/components/material/category-dialog"
import { MaterialDialog } from "@/components/material/material-dialog"
import { MaterialEditDialog } from "@/components/material/material-edit-dialog"
import { MaterialDeleteDialog } from "@/components/material/material-delete-dialog"
import { MaterialNotesDialog } from "@/components/material/material-notes-dialog"
import { CategoryEditDialog } from "@/components/material/category-edit-dialog"
import { CategoryDeleteDialog } from "@/components/material/category-delete-dialog"
import { SimpleCategoryActions } from "@/components/material/simple-category-actions"

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
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")

  useEffect(() => {
    fetchBrandData()
  }, [brandSlug])

  const fetchBrandData = async () => {
    try {
      setLoading(true)

      // Fetch brand info
      const brandResponse = await fetch(`/api/material/brands/${brandSlug}`)
      if (!brandResponse.ok) {
        throw new Error("Failed to fetch brand")
      }
      const brandData = await brandResponse.json()
      setBrand(brandData)

      // Fetch categories for this brand
      const categoriesResponse = await fetch(`/api/material/categories?brand=${brandSlug}`)
      if (!categoriesResponse.ok) {
        throw new Error("Failed to fetch categories")
      }
      const categoriesData = await categoriesResponse.json()
      setCategories(categoriesData)

      // Fetch materials for each category
      const materialsData: { [categoryId: string]: Material[] } = {}
      for (const category of categoriesData) {
        const materialsResponse = await fetch(`/api/material/items?category=${category.id}`)
        if (materialsResponse.ok) {
          const categoryMaterials = await materialsResponse.json()
          materialsData[category.id] = categoryMaterials
        }
      }
      setMaterials(materialsData)
    } catch (error) {
      console.error("Error fetching brand data:", error)
      toast({
        title: "Error",
        description: "Failed to load brand data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMaterialClick = (materialId: string) => {
    setSelectedMaterial(materialId)
    setNotesDialogOpen(true)
  }

  const handleEditMaterial = (material: Material) => {
    setEditingMaterial(material)
  }

  const handleDeleteMaterial = (material: Material) => {
    setDeletingMaterial(material)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
  }

  const handleDeleteCategory = (category: Category) => {
    setDeletingCategory(category)
  }

  const handleAddMaterial = (categoryId: string) => {
    setSelectedCategoryId(categoryId)
    setMaterialDialogOpen(true)
  }

  const refreshData = () => {
    fetchBrandData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!brand) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Brand Not Found</h1>
          <Button onClick={() => router.push("/material")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Materials
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push("/material")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{brand.name}</h1>
            <p className="text-muted-foreground">{brand.description}</p>
          </div>
        </div>
        <Button onClick={() => setCategoryDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="grid gap-6">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge style={{ backgroundColor: category.color }} className="text-white">
                    {category.name}
                  </Badge>
                  <CardDescription>{category.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => handleAddMaterial(category.id)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Material
                  </Button>
                  <SimpleCategoryActions
                    category={category}
                    onEdit={handleEditCategory}
                    onDelete={handleDeleteCategory}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {materials[category.id]?.length > 0 ? (
                <div className="grid gap-3">
                  {materials[category.id].map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleMaterialClick(material.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{material.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {material.part_number} • {material.quantity} {material.unit}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{material.status}</Badge>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditMaterial(material)
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteMaterial(material)
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No materials in this category yet</p>
                  <Button
                    variant="outline"
                    className="mt-2 bg-transparent"
                    onClick={() => handleAddMaterial(category.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Material
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {categories.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Categories Yet</h3>
              <p className="text-muted-foreground mb-4">Create your first category to start organizing materials</p>
              <Button onClick={() => setCategoryDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Category
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        brandSlug={brandSlug}
        onSuccess={refreshData}
      />

      <MaterialDialog
        open={materialDialogOpen}
        onOpenChange={setMaterialDialogOpen}
        categoryId={selectedCategoryId}
        onSuccess={refreshData}
      />

      {editingMaterial && (
        <MaterialEditDialog
          material={editingMaterial}
          open={!!editingMaterial}
          onOpenChange={(open) => !open && setEditingMaterial(null)}
          onSuccess={refreshData}
        />
      )}

      {deletingMaterial && (
        <MaterialDeleteDialog
          material={deletingMaterial}
          open={!!deletingMaterial}
          onOpenChange={(open) => !open && setDeletingMaterial(null)}
          onSuccess={refreshData}
        />
      )}

      {editingCategory && (
        <CategoryEditDialog
          category={editingCategory}
          open={!!editingCategory}
          onOpenChange={(open) => !open && setEditingCategory(null)}
          onSuccess={refreshData}
        />
      )}

      {deletingCategory && (
        <CategoryDeleteDialog
          category={deletingCategory}
          open={!!deletingCategory}
          onOpenChange={(open) => !open && setDeletingCategory(null)}
          onSuccess={refreshData}
        />
      )}

      {selectedMaterial && (
        <MaterialNotesDialog materialId={selectedMaterial} open={notesDialogOpen} onOpenChange={setNotesDialogOpen} />
      )}
    </div>
  )
}
