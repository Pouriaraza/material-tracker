import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  console.log("🔄 PUT API called for category:", params.id)

  try {
    const supabase = createClient()

    // Check authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()

    if (authError) {
      console.error("❌ Auth error:", authError)
      return NextResponse.json({ error: "Authentication error" }, { status: 401 })
    }

    if (!session) {
      console.error("❌ No session found")
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("✅ User authenticated:", session.user.id)

    const body = await request.json()
    const { name, description, color } = body

    console.log("📝 Update data:", { name, description, color })

    // First check if category exists
    const { data: existingCategory, error: checkError } = await supabase
      .from("material_categories")
      .select("id, name, created_by")
      .eq("id", params.id)
      .maybeSingle()

    if (checkError) {
      console.error("❌ Error checking category:", checkError)
      return NextResponse.json({ error: "Database error: " + checkError.message }, { status: 500 })
    }

    if (!existingCategory) {
      console.error("❌ Category not found")
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    console.log("✅ Category found:", existingCategory.name)

    // Update the category
    const { data: updatedCategory, error: updateError } = await supabase
      .from("material_categories")
      .update({
        name,
        description,
        color,
        updated_at: new Date().toISOString(),
        created_by: session.user.id,
      })
      .eq("id", params.id)
      .select()

    if (updateError) {
      console.error("❌ Error updating category:", updateError)
      return NextResponse.json({ error: "Failed to update category: " + updateError.message }, { status: 500 })
    }

    if (!updatedCategory || updatedCategory.length === 0) {
      console.error("❌ No category was updated")
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    console.log("✅ Category updated successfully")
    return NextResponse.json({ category: updatedCategory[0] })
  } catch (error) {
    console.error("💥 Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error: " + String(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  console.log("🔥 DELETE API called for category:", params.id)

  try {
    const supabase = createClient()

    // Check authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()

    if (authError) {
      console.error("❌ Auth error:", authError)
      return NextResponse.json({ error: "Authentication error" }, { status: 401 })
    }

    if (!session) {
      console.error("❌ No session found")
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("✅ User authenticated:", session.user.id)

    // Check if category exists
    const { data: existingCategory, error: checkError } = await supabase
      .from("material_categories")
      .select("id, name, created_by")
      .eq("id", params.id)
      .maybeSingle()

    if (checkError) {
      console.error("❌ Error checking category:", checkError)
      return NextResponse.json({ error: "Database error: " + checkError.message }, { status: 500 })
    }

    if (!existingCategory) {
      console.error("❌ Category not found")
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    console.log("✅ Category found:", existingCategory.name)

    // Delete materials first
    console.log("🗑️ Deleting materials in category...")
    const { error: materialsError } = await supabase.from("materials").delete().eq("category_id", params.id)

    if (materialsError) {
      console.error("❌ Error deleting materials:", materialsError)
      return NextResponse.json({ error: "Failed to delete materials: " + materialsError.message }, { status: 500 })
    }

    console.log("✅ Materials deleted")

    // Delete category
    console.log("🗑️ Deleting category...")
    const { error: categoryError } = await supabase.from("material_categories").delete().eq("id", params.id)

    if (categoryError) {
      console.error("❌ Error deleting category:", categoryError)
      return NextResponse.json({ error: "Failed to delete category: " + categoryError.message }, { status: 500 })
    }

    console.log("✅ Category deleted successfully")
    return NextResponse.json({ success: true, message: "Category deleted successfully" })
  } catch (error) {
    console.error("💥 Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error: " + String(error) }, { status: 500 })
  }
}
