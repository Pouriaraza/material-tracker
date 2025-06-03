"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Category {
  id: string
  name: string
  brand: string
}

export default function DebugPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const fetchCategories = async () => {
    try {
      setMessage("Fetching categories...")
      const response = await fetch("/api/material/categories?brand=ericsson")
      const data = await response.json()

      if (response.ok) {
        setCategories(data.categories || [])
        setMessage(`Found ${data.categories?.length || 0} categories`)
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (error) {
      setMessage(`Fetch error: ${error}`)
    }
  }

  const testDelete = async (categoryId: string, categoryName: string) => {
    setLoading(true)
    setMessage(`Attempting to delete ${categoryName}...`)

    try {
      console.log("Sending DELETE request to:", `/api/material/categories/${categoryId}`)

      const response = await fetch(`/api/material/categories/${categoryId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("Response status:", response.status)
      console.log("Response headers:", response.headers)

      const responseText = await response.text()
      console.log("Response text:", responseText)

      if (response.ok) {
        setMessage(`✅ Successfully deleted ${categoryName}`)
        fetchCategories() // Refresh list
      } else {
        setMessage(`❌ Delete failed: ${response.status} - ${responseText}`)
      }
    } catch (error) {
      console.error("Delete error:", error)
      setMessage(`❌ Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const createTestCategory = async () => {
    setLoading(true)
    setMessage("Creating test category...")

    try {
      const response = await fetch("/api/material/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test Category " + Date.now(),
          description: "Test category for deletion",
          brand: "ericsson",
          color: "#FF0000",
        }),
      })

      if (response.ok) {
        setMessage("✅ Test category created")
        fetchCategories()
      } else {
        const errorData = await response.text()
        setMessage(`❌ Failed to create: ${errorData}`)
      }
    } catch (error) {
      setMessage(`❌ Create error: ${error}`)
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
          <CardTitle>Delete Debug Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={fetchCategories} disabled={loading}>
              Refresh Categories
            </Button>
            <Button onClick={createTestCategory} disabled={loading}>
              Create Test Category
            </Button>
          </div>

          <div className="p-4 bg-gray-100 rounded">
            <strong>Status:</strong> {message}
          </div>

          <div>
            <h3 className="font-bold mb-2">Categories ({categories.length}):</h3>
            {categories.length === 0 ? (
              <p>No categories found</p>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-2 border rounded">
                    <span>
                      {category.name} (ID: {category.id.substring(0, 8)}...)
                    </span>
                    <Button
                      onClick={() => testDelete(category.id, category.name)}
                      disabled={loading}
                      variant="destructive"
                      size="sm"
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-sm text-gray-600">
            <p>Open browser console (F12) to see detailed logs</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
