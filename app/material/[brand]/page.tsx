"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Search, ArrowLeft, Package, Tag } from "lucide-react"
import { MaterialDialog } from "@/components/material/material-dialog"
import { MaterialEditDialog } from "@/components/material/material-edit-dialog"
import { MaterialDeleteDialog } from "@/components/material/material-delete-dialog"
import { CategoryDialog } from "@/components/material/category-dialog"
import { CategoryEditDialog } from "@/components/material/category-edit-dialog"
import { CategoryDeleteDialog } from "@/components/material/category-delete-dialog"
import { MaterialNotesDialog } from "@/components/material/material-notes-dialog"
import { toast } from "sonner"

interface Category {
  id: string
  name: string
  description?: string
  brand: string
  created_at: string
}

interface Material {
  id: string
  name: string
  description?: string
  category_id: string
  brand: string
  part_number?: string
  specifications?: string
  notes?: string
  created_at: string
  category?: Category
}

interface Brand {
  id: string
  name: string
  slug: string
  description?: string
}

export default function MaterialBrandPage() {
  const params = useParams()
  const router = useRouter()
  const brandSlug = params.brand as string
  const supabase = createClient()

  const [brand, setBrand] = useState<Brand | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  // Dialog states
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false)
  const [materialEditDialog, setMaterialEditDialog] = useState<{ open: boolean; material: Material | null }>({
    open: false,
    material: null,
  })
  const [materialDeleteDialog, setMaterialDeleteDialog] = useState<{ open: boolean; material: Material | null }>({
    open: false,
    material: null,
  })
  const [materialNotesDialog, setMaterialNotesDialog] = useState<{ open: boolean; material: Material | null }>({
    open: false,
    material: null,
  })
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [categoryEditDialog, setCategoryEditDialog] = useState<{ open: boolean; category: Category | null }>({
    open: false,
    category: null,
  })
  const [categoryDeleteDialog, setCategoryDeleteDialog] = useState<{ open: boolean; category: Category | null }>({
    open: false,
    category: null,
  })

  // Mock data for preview environment
  const mockBrand: Brand = {
    id: "1",
    name: brandSlug.charAt(0).toUpperCase() + brandSlug.slice(1),
    slug: brandSlug,
    description: `${brandSlug.charAt(0).toUpperCase() + brandSlug.slice(1)} telecommunications equipment and materials`,
  }

  const mockCategories: Category[] = [
    {
      id: "1",
      name: "Antennas",
      description: "Various antenna types and configurations",
      brand: brandSlug,
      created_at: new Date().toISOString(),
    },
    {
      id: "2",
      name: "Cables",
      description: "Fiber optic and coaxial cables",
      brand: brandSlug,
      created_at: new Date().toISOString(),
    },
    {
      id: "3",
      name: "Base Station Equipment",
      description: "Radio units and processing equipment",
      brand: brandSlug,
      created_at: new Date().toISOString(),
    },
  ]

  const mockMaterials: Material[] = [
    {
      id: "1",
      name: "AIR 3218 Antenna",
      description: "Multi-band antenna for 5G networks",
      category_id: "1",
      brand: brandSlug,
      part_number: "AIR3218-B25",
      specifications: "Frequency: 1.7-2.7 GHz, Gain: 17.5 dBi",
      notes: "Requires special mounting hardware",
      created_at: new Date().toISOString(),
      category: mockCategories[0],
    },
    {
      id: "2",
      name: "Fiber Optic Cable",
      description: "Single-mode fiber optic cable",
      category_id: "2",
      brand: brandSlug,
      part_number: "FOC-SM-24",
      specifications: "24 core, OS2 standard",
      notes: "Indoor/outdoor rated",
      created_at: new Date().toISOString(),
      category: mockCategories[1],
    },
    {
      id: "3",
      name: "Radio Unit 5G",
      description: "5G NR radio unit",
      category_id: "3",
      brand: brandSlug,
      part_number: "RU5G-2600",
      specifications: "Band n7 (2600 MHz), 200W",
      notes: "Requires cooling system",
      created_at: new Date().toISOString(),
      category: mockCategories[2],
    },
  ]

  useEffect(() => {
    loadData()
  }, [brandSlug])

  const loadData = async () => {
    setLoading(true)
    try {
      // Check if we're in preview mode
      const isPreview = typeof window !== "undefined" && window.location.hostname.includes("lite.vusercontent.net")

      if (isPreview) {
        // Use mock data for preview
        setBrand(mockBrand)
        setCategories(mockCategories)
        setMaterials(mockMaterials)
        setLoading(false)
        return
      }

      // Load brand
      const { data: brandData, error: brandError } = await supabase
        .from("material_brands")
        .select("*")
        .eq("slug", brandSlug)
        .single()

      if (brandError) {
        console.error("Error loading brand:", brandError)
        // Fallback to mock data
        setBrand(mockBrand)
      } else {
        setBrand(brandData)
      }

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("material_categories")
        .select("*")
        .eq("brand", brandSlug)
        .order("name")

      if (categoriesError) {
        console.error("Error loading categories:", categoriesError)
        setCategories(mockCategories)
      } else {
        setCategories(categoriesData || [])
      }

      // Load materials with categories
      const { data: materialsData, error: materialsError } = await supabase
        .from("materials")
        .select(`
          *,
          category:material_categories(*)
        `)
        .eq("brand", brandSlug)
        .order("name")

      if (materialsError) {
        console.error("Error loading materials:", materialsError)
        setMaterials(mockMaterials)
      } else {
        setMaterials(materialsData || [])
      }
    } catch (error) {
      console.error("Error loading data:", error)
      // Fallback to mock data
      setBrand(mockBrand)
      setCategories(mockCategories)
      setMaterials(mockMaterials)
    } finally {
      setLoading(false)
    }
  }

  const handleMaterialCreate = async (materialData: any) => {
    try {
      const isPreview = typeof window !== "undefined" && window.location.hostname.includes("lite.vusercontent.net")

      if (isPreview) {
        // Mock creation for preview
        const newMaterial: Material = {
          id: Date.now().toString(),
          ...materialData,
          brand: brandSlug,
          created_at: new Date().toISOString(),
          category: categories.find((c) => c.id === materialData.category_id),
        }
        setMaterials((prev) => [...prev, newMaterial])
        toast.success("Material created successfully")
        return
      }

      const { data, error } = await supabase
        .from("materials")
        .insert([{ ...materialData, brand: brandSlug }])
        .select(`
          *,
          category:material_categories(*)
        `)
        .single()

      if (error) throw error

      setMaterials((prev) => [...prev, data])
      toast.success("Material created successfully")
    } catch (error) {
      console.error("Error creating material:", error)
      toast.error("Failed to create material")
    }
  }

  const handleMaterialUpdate = async (id: string, materialData: any) => {
    try {
      const isPreview = typeof window !== "undefined" && window.location.hostname.includes("lite.vusercontent.net")

      if (isPreview) {
        // Mock update for preview
        setMaterials((prev) =>
          prev.map((material) =>
            material.id === id
              ? {
                  ...material,
                  ...materialData,
                  category: categories.find((c) => c.id === materialData.category_id),
                }
              : material,
          ),
        )
        toast.success("Material updated successfully")
        return
      }

      const { data, error } = await supabase
        .from("materials")
        .update(materialData)
        .eq("id", id)
        .select(`
          *,
          category:material_categories(*)
        `)
        .single()

      if (error) throw error

      setMaterials((prev) => prev.map((material) => (material.id === id ? data : material)))
      toast.success("Material updated successfully")
    } catch (error) {
      console.error("Error updating material:", error)
      toast.error("Failed to update material")
    }
  }

  const handleMaterialDelete = async (id: string) => {
    try {
      const isPreview = typeof window !== "undefined" && window.location.hostname.includes("lite.vusercontent.net")

      if (isPreview) {
        // Mock deletion for preview
        setMaterials((prev) => prev.filter((material) => material.id !== id))
        toast.success("Material deleted successfully")
        return
      }

      const { error } = await supabase.from("materials").delete().eq("id", id)

      if (error) throw error

      setMaterials((prev) => prev.filter((material) => material.id !== id))
      toast.success("Material deleted successfully")
    } catch (error) {
      console.error("Error deleting material:", error)
      toast.error("Failed to delete material")
    }
  }

  const handleCategoryCreate = async (categoryData: any) => {
    try {
      const isPreview = typeof window !== "undefined" && window.location.hostname.includes("lite.vusercontent.net")

      if (isPreview) {
        // Mock creation for preview
        const newCategory: Category = {
          id: Date.now().toString(),
          ...categoryData,
          brand: brandSlug,
          created_at: new Date().toISOString(),
        }
        setCategories((prev) => [...prev, newCategory])
        toast.success("Category created successfully")
        return
      }

      const { data, error } = await supabase
        .from("material_categories")
        .insert([{ ...categoryData, brand: brandSlug }])
        .select()
        .single()

      if (error) throw error

      setCategories((prev) => [...prev, data])
      toast.success("Category created successfully")
    } catch (error) {
      console.error("Error creating category:", error)
      toast.error("Failed to create category")
    }
  }

  const handleCategoryUpdate = async (id: string, categoryData: any) => {
    try {
      const isPreview = typeof window !== "undefined" && window.location.hostname.includes("lite.vusercontent.net")

      if (isPreview) {
        // Mock update for preview
        setCategories((prev) =>
          prev.map((category) => (category.id === id ? { ...category, ...categoryData } : category)),
        )
        toast.success("Category updated successfully")
        return
      }

      const { data, error } = await supabase
        .from("material_categories")
        .update(categoryData)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      setCategories((prev) => prev.map((category) => (category.id === id ? data : category)))
      toast.success("Category updated successfully")
    } catch (error) {
      console.error("Error updating category:", error)
      toast.error("Failed to update category")
    }
  }

  const handleCategoryDelete = async (id: string) => {
    try {
      const isPreview = typeof window !== "undefined" && window.location.hostname.includes("lite.vusercontent.net")

      if (isPreview) {
        // Mock deletion for preview
        setCategories((prev) => prev.filter((category) => category.id !== id))
        toast.success("Category deleted successfully")
        return
      }

      const { error } = await supabase.from("material_categories").delete().eq("id", id)

      if (error) throw error

      setCategories((prev) => prev.filter((category) => category.id !== id))
      toast.success("Category deleted successfully")
    } catch (error) {
      console.error("Error deleting category:", error)
      toast.error("Failed to delete category")
    }
  }

  const filteredMaterials = materials.filter((material) => {
    const matchesSearch =
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.part_number?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = selectedCategory === "all" || material.category_id === selectedCategory

    return matchesSearch && matchesCategory
  })

  const materialsByCategory = categories.map((category) => ({
    category,
    materials: filteredMaterials.filter((material) => material.category_id === category.id),
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{brand?.name} Materials</h1>
          <p className="text-muted-foreground">{brand?.description}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCategoryDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
          <Button onClick={() => setMaterialDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Material
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="all">All Materials</TabsTrigger>
          {categories.slice(0, 3).map((category) => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {materialsByCategory.map(({ category, materials: categoryMaterials }) => (
            <div key={category.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">{category.name}</h2>
                  <Badge variant="secondary">{categoryMaterials.length}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCategoryEditDialog({ open: true, category })}>
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCategoryDeleteDialog({ open: true, category })}>
                    Delete
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryMaterials.map((material) => (
                  <Card key={material.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <CardTitle className="text-lg">{material.name}</CardTitle>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMaterialEditDialog({ open: true, material })}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMaterialDeleteDialog({ open: true, material })}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      {material.description && <CardDescription>{material.description}</CardDescription>}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {material.part_number && (
                        <div className="text-sm">
                          <span className="font-medium">Part Number:</span> {material.part_number}
                        </div>
                      )}
                      {material.specifications && (
                        <div className="text-sm">
                          <span className="font-medium">Specifications:</span> {material.specifications}
                        </div>
                      )}
                      {material.notes && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMaterialNotesDialog({ open: true, material })}
                        >
                          View Notes
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {categoryMaterials.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">No materials found in this category</div>
              )}
            </div>
          ))}
        </TabsContent>

        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                <h2 className="text-xl font-semibold">{category.name}</h2>
                <Badge variant="secondary">
                  {filteredMaterials.filter((m) => m.category_id === category.id).length}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCategoryEditDialog({ open: true, category })}>
                  Edit Category
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCategoryDeleteDialog({ open: true, category })}>
                  Delete Category
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMaterials
                .filter((material) => material.category_id === category.id)
                .map((material) => (
                  <Card key={material.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <CardTitle className="text-lg">{material.name}</CardTitle>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMaterialEditDialog({ open: true, material })}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMaterialDeleteDialog({ open: true, material })}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      {material.description && <CardDescription>{material.description}</CardDescription>}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {material.part_number && (
                        <div className="text-sm">
                          <span className="font-medium">Part Number:</span> {material.part_number}
                        </div>
                      )}
                      {material.specifications && (
                        <div className="text-sm">
                          <span className="font-medium">Specifications:</span> {material.specifications}
                        </div>
                      )}
                      {material.notes && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMaterialNotesDialog({ open: true, material })}
                        >
                          View Notes
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>

            {filteredMaterials.filter((m) => m.category_id === category.id).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No materials found in this category</div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Dialogs */}
      <MaterialDialog
        open={materialDialogOpen}
        onOpenChange={setMaterialDialogOpen}
        onSubmit={handleMaterialCreate}
        categories={categories}
      />

      <MaterialEditDialog
        open={materialEditDialog.open}
        onOpenChange={(open) => setMaterialEditDialog({ open, material: null })}
        material={materialEditDialog.material}
        onSubmit={handleMaterialUpdate}
        categories={categories}
      />

      <MaterialDeleteDialog
        open={materialDeleteDialog.open}
        onOpenChange={(open) => setMaterialDeleteDialog({ open, material: null })}
        material={materialDeleteDialog.material}
        onConfirm={handleMaterialDelete}
      />

      <MaterialNotesDialog
        open={materialNotesDialog.open}
        onOpenChange={(open) => setMaterialNotesDialog({ open, material: null })}
        material={materialNotesDialog.material}
      />

      <CategoryDialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen} onSubmit={handleCategoryCreate} />

      <CategoryEditDialog
        open={categoryEditDialog.open}
        onOpenChange={(open) => setCategoryEditDialog({ open, category: null })}
        category={categoryEditDialog.category}
        onSubmit={handleCategoryUpdate}
      />

      <CategoryDeleteDialog
        open={categoryDeleteDialog.open}
        onOpenChange={(open) => setCategoryDeleteDialog({ open, category: null })}
        category={categoryDeleteDialog.category}
        onConfirm={handleCategoryDelete}
      />
    </div>
  )
}
