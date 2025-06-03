"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function NewSheetPage() {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      const { data, error } = await supabase
        .from("sheets")
        .insert([{ name, owner_id: user.id }])
        .select()
        .single()

      if (error) {
        setError(error.message)
        return
      }

      // Create default columns
      const defaultColumns = [
        { sheet_id: data.id, name: "Site ID", type: "text", position: 0 },
        { sheet_id: data.id, name: "Scenario", type: "text", position: 1 },
        { sheet_id: data.id, name: "MR Number", type: "text", position: 2 },
        { sheet_id: data.id, name: "IQF Number", type: "text", position: 3 },
        { sheet_id: data.id, name: "Status Delivery", type: "text", position: 4 },
        { sheet_id: data.id, name: "Approve Date", type: "date", position: 5 },
        { sheet_id: data.id, name: "Contractor Name", type: "text", position: 6 },
        { sheet_id: data.id, name: "Region", type: "text", position: 7 },
        { sheet_id: data.id, name: "Note", type: "text", position: 8 },
      ]

      await supabase.from("columns").insert(defaultColumns)

      // Create first empty row
      const { data: row } = await supabase
        .from("rows")
        .insert([{ sheet_id: data.id, position: 0 }])
        .select()
        .single()

      // Initialize cells for the new row
      const cells = defaultColumns.map((column) => {
        let defaultValue: any = null

        if (column.type === "date") {
          defaultValue = new Date().toISOString().split("T")[0]
        } else if (column.type === "number") {
          defaultValue = 0
        } else if (column.type === "checkbox") {
          defaultValue = false
        } else {
          defaultValue = ""
        }

        return {
          row_id: row.id,
          column_id: column.id,
          value: defaultValue,
        }
      })

      await supabase.from("cells").insert(cells)

      router.push(`/sheets/${data.id}`)
    } catch (err) {
      setError("An unexpected error occurred")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Create New Sheet</CardTitle>
            <CardDescription>Enter a name for your new sheet</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Sheet Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Sheet"
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={isLoading || !name.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                  </>
                ) : (
                  "Create Sheet"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
