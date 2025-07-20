import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sheetId = params.id

    if (!sheetId) {
      return NextResponse.json({ error: "Sheet ID is required" }, { status: 400 })
    }

    // Try to use the database function first for safe row creation
    try {
      const { data: newRow, error: functionError } = await supabase.rpc("add_new_row_with_position", {
        sheet_id_param: sheetId,
        user_id_param: user.id,
      })

      if (!functionError && newRow && newRow.length > 0) {
        // Get columns to create default cells
        const { data: columns } = await supabase
          .from("columns")
          .select("id, type, default_value")
          .eq("sheet_id", sheetId)
          .order("position")

        if (columns && columns.length > 0) {
          const cells = columns.map((column) => ({
            row_id: newRow[0].id,
            column_id: column.id,
            value: getDefaultValue(column.type, column.default_value),
            validation_status: "valid" as const,
          }))

          await supabase.from("cells").insert(cells)
        }

        return NextResponse.json({
          success: true,
          data: {
            ...newRow[0],
            cells:
              columns?.reduce(
                (acc, col) => {
                  acc[col.id] = getDefaultValue(col.type, col.default_value)
                  return acc
                },
                {} as Record<string, any>,
              ) || {},
          },
        })
      }
    } catch (functionError) {
      console.log("Database function not available, using fallback method")
    }

    // Fallback method: Direct database insertion with position calculation and retry logic
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
      try {
        // Get the next available position with a small random offset to reduce collisions
        const { data: maxPositionResult } = await supabase
          .from("rows")
          .select("position")
          .eq("sheet_id", sheetId)
          .eq("is_deleted", false)
          .order("position", { ascending: false })
          .limit(1)

        const basePosition = (maxPositionResult?.[0]?.position || -1) + 1
        const nextPosition = basePosition + Math.floor(Math.random() * 1000) // Add random offset

        // Check if this position already exists
        const { data: existingRow } = await supabase
          .from("rows")
          .select("id")
          .eq("sheet_id", sheetId)
          .eq("position", nextPosition)
          .eq("is_deleted", false)
          .maybeSingle()

        if (existingRow) {
          retryCount++
          continue // Try again with a different position
        }

        const { data: newRow, error: insertError } = await supabase
          .from("rows")
          .insert({
            sheet_id: sheetId,
            position: nextPosition,
            metadata: { created_by: user.id },
            is_deleted: false,
          })
          .select()
          .single()

        if (insertError) {
          if (insertError.code === "23505" && retryCount < maxRetries - 1) {
            // Unique constraint violation, retry
            retryCount++
            continue
          }
          throw insertError
        }

        // Get columns to create default cells
        const { data: columns } = await supabase
          .from("columns")
          .select("id, type, default_value")
          .eq("sheet_id", sheetId)
          .order("position")

        if (columns && columns.length > 0) {
          const cells = columns.map((column) => ({
            row_id: newRow.id,
            column_id: column.id,
            value: getDefaultValue(column.type, column.default_value),
            validation_status: "valid" as const,
          }))

          await supabase.from("cells").insert(cells)
        }

        return NextResponse.json({
          success: true,
          data: {
            ...newRow,
            cells:
              columns?.reduce(
                (acc, col) => {
                  acc[col.id] = getDefaultValue(col.type, col.default_value)
                  return acc
                },
                {} as Record<string, any>,
              ) || {},
          },
        })
      } catch (error: any) {
        if (error.code === "23505" && retryCount < maxRetries - 1) {
          // Unique constraint violation, retry
          retryCount++
          await new Promise((resolve) => setTimeout(resolve, 100 * retryCount)) // Exponential backoff
          continue
        }
        throw error
      }
    }

    // If we've exhausted all retries, use a timestamp-based position
    const timestampPosition = Date.now()
    const { data: newRow, error: insertError } = await supabase
      .from("rows")
      .insert({
        sheet_id: sheetId,
        position: timestampPosition,
        metadata: { created_by: user.id },
        is_deleted: false,
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting row with timestamp position:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Get columns to create default cells
    const { data: columns } = await supabase
      .from("columns")
      .select("id, type, default_value")
      .eq("sheet_id", sheetId)
      .order("position")

    if (columns && columns.length > 0) {
      const cells = columns.map((column) => ({
        row_id: newRow.id,
        column_id: column.id,
        value: getDefaultValue(column.type, column.default_value),
        validation_status: "valid" as const,
      }))

      await supabase.from("cells").insert(cells)
    }

    return NextResponse.json({
      success: true,
      data: {
        ...newRow,
        cells:
          columns?.reduce(
            (acc, col) => {
              acc[col.id] = getDefaultValue(col.type, col.default_value)
              return acc
            },
            {} as Record<string, any>,
          ) || {},
      },
    })
  } catch (error: any) {
    console.error("Error adding row:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to add row",
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { rowId, columnId, value } = await request.json()

    if (!rowId || !columnId) {
      return NextResponse.json({ error: "Missing rowId or columnId" }, { status: 400 })
    }

    // Check if cell exists
    const { data: existingCell } = await supabase
      .from("cells")
      .select("id")
      .eq("row_id", rowId)
      .eq("column_id", columnId)
      .maybeSingle()

    if (existingCell) {
      // Update existing cell
      const { error } = await supabase
        .from("cells")
        .update({
          value: typeof value === "string" ? value : JSON.stringify(value),
          updated_at: new Date().toISOString(),
        })
        .eq("row_id", rowId)
        .eq("column_id", columnId)

      if (error) {
        console.error("Error updating cell:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      // Insert new cell
      const { error } = await supabase.from("cells").insert({
        row_id: rowId,
        column_id: columnId,
        value: typeof value === "string" ? value : JSON.stringify(value),
        validation_status: "valid",
      })

      if (error) {
        console.error("Error inserting cell:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error updating cell:", error)
    return NextResponse.json({ error: error.message || "Failed to update cell" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { rowId } = await request.json()

    if (!rowId) {
      return NextResponse.json({ error: "Missing rowId" }, { status: 400 })
    }

    // Soft delete the row
    const { error } = await supabase.from("rows").update({ is_deleted: true }).eq("id", rowId)

    if (error) {
      console.error("Error deleting row:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting row:", error)
    return NextResponse.json({ error: error.message || "Failed to delete row" }, { status: 500 })
  }
}

function getDefaultValue(type: string, defaultValue?: string): any {
  if (defaultValue) return defaultValue

  switch (type) {
    case "number":
      return 0
    case "checkbox":
      return false
    case "date":
      return new Date().toISOString().split("T")[0]
    case "select":
      return null
    default:
      return ""
  }
}
