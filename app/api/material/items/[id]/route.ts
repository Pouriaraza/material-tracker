import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { id } = params

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, notes, part_number, quantity, unit, location, status } = body

    // Update the material
    const { data, error } = await supabase
      .from("materials")
      .update({
        name,
        description,
        notes,
        part_number,
        quantity: Number.parseInt(quantity) || 0,
        unit,
        location,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("created_by", user.id) // Ensure user can only update their own materials
      .select()
      .single()

    if (error) {
      console.error("Error updating material:", error)
      return NextResponse.json({ error: "Failed to update material" }, { status: 500 })
    }

    return NextResponse.json({ material: data })
  } catch (error) {
    console.error("Error in PUT /api/material/items/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { id } = params

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete the material
    const { error } = await supabase.from("materials").delete().eq("id", id).eq("created_by", user.id) // Ensure user can only delete their own materials

    if (error) {
      console.error("Error deleting material:", error)
      return NextResponse.json({ error: "Failed to delete material" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/material/items/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
