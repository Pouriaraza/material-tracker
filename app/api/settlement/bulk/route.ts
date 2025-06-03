import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// POST: Bulk operations on settlement items
export async function POST(request: Request) {
  try {
    const { action, ids, status, mrNumbers } = await request.json()

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Handle different bulk actions
    switch (action) {
      case "update_status":
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return NextResponse.json({ error: "Item IDs are required" }, { status: 400 })
        }

        if (!status) {
          return NextResponse.json({ error: "Status is required" }, { status: 400 })
        }

        const { data: updatedItems, error: updateError } = await supabase
          .from("settlement_items")
          .update({ status, updated_at: new Date().toISOString() })
          .in("id", ids)
          .select()

        if (updateError) {
          console.error("Error bulk updating settlement items:", updateError)
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        return NextResponse.json({ data: updatedItems })

      case "delete":
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return NextResponse.json({ error: "Item IDs are required" }, { status: 400 })
        }

        const { error: deleteError } = await supabase.from("settlement_items").delete().in("id", ids)

        if (deleteError) {
          console.error("Error bulk deleting settlement items:", deleteError)
          return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })

      case "import":
        if (!mrNumbers || !Array.isArray(mrNumbers) || mrNumbers.length === 0) {
          return NextResponse.json({ error: "MR Numbers are required" }, { status: 400 })
        }

        // Check for existing MR numbers
        const { data: existingItems, error: checkError } = await supabase
          .from("settlement_items")
          .select("mr_number")
          .in("mr_number", mrNumbers)

        if (checkError) {
          console.error("Error checking for existing settlement items:", checkError)
          return NextResponse.json({ error: checkError.message }, { status: 500 })
        }

        const existingMrNumbers = new Set((existingItems || []).map((item) => item.mr_number))
        const newMrNumbers = mrNumbers.filter((mrNumber) => !existingMrNumbers.has(mrNumber))

        if (newMrNumbers.length === 0) {
          return NextResponse.json({
            data: [],
            duplicatesCount: mrNumbers.length,
            message: "All MR Numbers already exist",
          })
        }

        const itemsToInsert = newMrNumbers.map((mrNumber) => ({
          mr_number: mrNumber,
          status: "none",
        }))

        const { data: importedItems, error: importError } = await supabase
          .from("settlement_items")
          .insert(itemsToInsert)
          .select()

        if (importError) {
          console.error("Error importing settlement items:", importError)
          return NextResponse.json({ error: importError.message }, { status: 500 })
        }

        return NextResponse.json({
          data: importedItems,
          duplicatesCount: mrNumbers.length - newMrNumbers.length,
        })

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    console.error("Unexpected error in POST /api/settlement/bulk:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
