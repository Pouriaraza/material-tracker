"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, Plus, Wrench } from "lucide-react"
import Link from "next/link"
import { BrandDialog } from "@/components/material/brand-dialog"
import { useToast } from "@/hooks/use-toast"

interface Brand {
  id: string
  name: string
  slug: string
  description: string
  color: string
}

export default function MaterialPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchBrands()
  }, [])

  const fetchBrands = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/material/brands")
      const data = await response.json()

      if (response.ok) {
        setBrands(data.brands || [])
        setError(null)
      } else {
        setError(data.error || "Failed to fetch brands")
      }
    } catch (error) {
      console.error("Error fetching brands:", error)
      setError("Failed to connect to database")
    } finally {
      setLoading(false)
    }
  }

  const handleBrandCreated = () => {
    fetchBrands()
    toast({
      title: "Brand created",
      description: "New brand has been created successfully",
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error loading brands</p>
          <p>{error}</p>
          <div className="mt-4">
            <Button onClick={fetchBrands}>Retry</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Package className="mr-3 h-8 w-8" />
            Material Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage equipment and materials inventory by brand</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button asChild className="flex-1 sm:flex-none">
            <Link href="/material/setup">
              <Wrench className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Database</span> Setup
            </Link>
          </Button>
          <BrandDialog onBrandCreated={handleBrandCreated} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {brands.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-8">
              <Package className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No brands created yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first brand to start organizing materials
              </p>
              <BrandDialog onBrandCreated={handleBrandCreated} />
            </CardContent>
          </Card>
        ) : (
          brands.map((brand) => (
            <Card key={brand.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <Link href={`/material/${brand.slug}`}>
                <CardHeader
                  className="pb-3"
                  style={{ backgroundColor: brand.color + "10", borderBottom: `2px solid ${brand.color}` }}
                >
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: brand.color }} />
                    {brand.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {brand.description || "No description provided"}
                  </p>
                  <div className="mt-4 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      style={{ borderColor: brand.color, color: brand.color }}
                      className="group"
                    >
                      <span>View Materials</span>
                      <Plus
                        className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: brand.color }}
                      />
                    </Button>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
