"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Category {
  id: string
  name: string
  brand: string
}

export default function TestDeletePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/material/categories?brand=ericsson")
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const deleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"?`)) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/material/categories/${categoryId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        alert("Category deleted successfully!")
        fetchCategories()
      } else {
        alert("Error: " + data.error)
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Failed to delete category")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Delete Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-3 border rounded">
                <span>{category.name}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteCategory(category.id, category.name)}
                  disabled={loading}
                >
                  Delete
                </Button>
              </div>
            ))}
            <Button onClick={fetchCategories}>Refresh</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
