import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// PATCH: Update a settlement item
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { status, notes } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const updateData: any = { updated_at: new Date().toISOString() }

    // Only update the fields that were provided
    if (status !== undefined) {
      updateData.status = status
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    const { data, error } = await supabase.from("settlement_items").update(updateData).eq("id", id).select().single()

    if (error) {
      console.error("Error updating settlement item:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Unexpected error in PATCH /api/settlement/[id]:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

// DELETE: Delete a settlement item
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase.from("settlement_items").delete().eq("id", id)

    if (error) {
      console.error("Error deleting settlement item:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unexpected error in DELETE /api/settlement/[id]:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
