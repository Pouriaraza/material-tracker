import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sheetId = params.id

    // Get the highest position
    const { data: rows, error: rowsError } = await supabase
      .from("rows")
      .select("position")
      .eq("sheet_id", sheetId)
      .order("position", { ascending: false })
      .limit(1)

    if (rowsError) {
      console.error("Error fetching rows:", rowsError)
      return NextResponse.json({ error: "Failed to fetch rows" }, { status: 500 })
    }

    const position = rows.length > 0 ? rows[0].position + 1 : 0

    // Add the new row
    const { data: newRow, error } = await supabase
      .from("rows")
      .insert([{ sheet_id: sheetId, position }])
      .select()
      .single()

    if (error) {
      console.error("Error adding row:", error)
      return NextResponse.json({ error: "Failed to add row" }, { status: 500 })
    }

    // Get columns to initialize cells
    const { data: columns, error: columnsError } = await supabase
      .from("columns")
      .select("id, type")
      .eq("sheet_id", sheetId)

    if (columnsError) {
      console.error("Error fetching columns:", columnsError)
      return NextResponse.json({
        ...newRow,
        cells: {},
      })
    }

    // Initialize cells for the new row
    const cells = columns.map((column) => {
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
        row_id: newRow.id,
        column_id: column.id,
        value: defaultValue,
      }
    })

    if (cells.length > 0) {
      const { error: cellsError } = await supabase.from("cells").insert(cells)

      if (cellsError) {
        console.error("Error initializing cells:", cellsError)
      }
    }

    // Return the new row with initialized cells
    const cellsObject: Record<string, any> = {}
    cells.forEach((cell) => {
      cellsObject[cell.column_id] = cell.value
    })

    return NextResponse.json({
      ...newRow,
      cells: cellsObject,
    })
  } catch (error) {
    console.error("Error in POST /api/sheets-new/[id]/rows:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { rowId, columnId, value } = await request.json()

    // Check if cell exists
    const { data: cell, error: cellError } = await supabase
      .from("cells")
      .select("id")
      .eq("row_id", rowId)
      .eq("column_id", columnId)
      .maybeSingle()

    if (cellError) {
      console.error("Error checking cell:", cellError)
      return NextResponse.json({ error: "Failed to check cell" }, { status: 500 })
    }

    if (cell) {
      // Update existing cell
      const { error: updateError } = await supabase.from("cells").update({ value }).eq("id", cell.id)

      if (updateError) {
        console.error("Error updating cell:", updateError)
        return NextResponse.json({ error: "Failed to update cell" }, { status: 500 })
      }
    } else {
      // Insert new cell
      const { error: insertError } = await supabase
        .from("cells")
        .insert([{ row_id: rowId, column_id: columnId, value }])

      if (insertError) {
        console.error("Error inserting cell:", insertError)
        return NextResponse.json({ error: "Failed to insert cell" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in PATCH /api/sheets-new/[id]/rows:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { rowId } = await request.json()

    // Delete the row (cascade will delete related cells)
    const { error } = await supabase.from("rows").delete().eq("id", rowId)

    if (error) {
      console.error("Error deleting row:", error)
      return NextResponse.json({ error: "Failed to delete row" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/sheets-new/[id]/rows:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
