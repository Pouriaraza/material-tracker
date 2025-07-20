import { createClient } from "@/lib/supabase/server"

interface SheetData {
  id: string
  name: string
  description?: string
  owner_id: string
  is_active: boolean
  settings: any
  metadata: any
  created_at: string
  updated_at: string
}

interface ColumnData {
  id: string
  sheet_id: string
  name: string
  type: "text" | "number" | "date" | "checkbox" | "select" | "email" | "url"
  position: number
  width: number
  is_required: boolean
  is_unique: boolean
  default_value?: string
  validation_rules: any
  format_options: any
}

interface RowData {
  id: string
  sheet_id: string
  position: number
  is_deleted: boolean
  metadata: any
  cells: Record<string, any>
}

interface CellData {
  id: string
  row_id: string
  column_id: string
  value: any
  formatted_value?: string
  validation_status: "valid" | "invalid" | "warning"
  validation_message?: string
}

export class SheetsDatabase {
  private supabase = createClient()

  // Get sheet data efficiently
  async getSheetData(sheetId: string, userId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase.rpc("get_sheet_data", {
        sheet_id_param: sheetId,
        user_id_param: userId,
      })

      if (error) {
        console.error("Error fetching sheet data:", error)
        return null
      }

      return data
    } catch (err) {
      console.error("Exception in getSheetData:", err)
      return null
    }
  }

  // Create new sheet
  async createSheet(name: string, description: string, userId: string, settings: any = {}): Promise<SheetData | null> {
    try {
      const { data: sheet, error: sheetError } = await this.supabase
        .from("sheets")
        .insert([
          {
            name,
            description,
            owner_id: userId,
            settings,
            metadata: { created_by: userId },
          },
        ])
        .select()
        .single()

      if (sheetError) {
        console.error("Error creating sheet:", sheetError)
        return null
      }

      // Create default columns
      const defaultColumns = [
        { name: "Site ID", type: "text", position: 0 },
        { name: "Scenario", type: "text", position: 1 },
        { name: "MR Number", type: "text", position: 2 },
        { name: "IQF Number", type: "text", position: 3 },
        { name: "Status", type: "select", position: 4, validation_rules: { options: ["Pending", "Done", "Problem"] } },
        { name: "Date", type: "date", position: 5 },
        { name: "Contractor", type: "text", position: 6 },
        { name: "Region", type: "text", position: 7 },
        { name: "Notes", type: "text", position: 8 },
      ]

      const columnsToInsert = defaultColumns.map((col) => ({
        sheet_id: sheet.id,
        width: 120,
        is_required: false,
        is_unique: false,
        validation_rules: col.validation_rules || {},
        format_options: {},
        ...col,
      }))

      await this.supabase.from("columns").insert(columnsToInsert)

      // Create first empty row using safe method
      await this.addRowSafely(sheet.id, userId)

      // Log action in history
      await this.logAction(sheet.id, userId, "create_sheet", {
        sheet_name: name,
        columns_count: defaultColumns.length,
      })

      return sheet
    } catch (err) {
      console.error("Exception in createSheet:", err)
      return null
    }
  }

  // Safe method to add a row with duplicate prevention
  private async addRowSafely(sheetId: string, userId: string, maxRetries = 3): Promise<RowData | null> {
    let retryCount = 0

    while (retryCount < maxRetries) {
      try {
        // Try to use the comprehensive database function first
        const { data: newRowData, error: functionError } = await this.supabase.rpc("add_row_with_cells", {
          sheet_id_param: sheetId,
          user_id_param: userId,
        })

        if (!functionError && newRowData) {
          return {
            id: newRowData.id,
            sheet_id: newRowData.sheet_id,
            position: newRowData.position,
            is_deleted: newRowData.is_deleted,
            metadata: newRowData.metadata,
            cells: newRowData.cells || {},
          }
        }

        // Try the simpler database function
        const { data: newRow, error: simpleFunctionError } = await this.supabase.rpc("add_new_row_with_position", {
          sheet_id_param: sheetId,
          user_id_param: userId,
        })

        if (!simpleFunctionError && newRow && newRow.length > 0) {
          return { ...newRow[0], cells: {} }
        }

        // Fallback method with position calculation
        const { data: maxPositionResult } = await this.supabase
          .from("rows")
          .select("position")
          .eq("sheet_id", sheetId)
          .eq("is_deleted", false)
          .order("position", { ascending: false })
          .limit(1)

        const basePosition = (maxPositionResult?.[0]?.position || -1) + 1
        const nextPosition = basePosition + Math.floor(Math.random() * 1000) // Add random offset

        // Check if this position already exists
        const { data: existingRow } = await this.supabase
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

        const { data: newRowFallback, error } = await this.supabase
          .from("rows")
          .insert([
            {
              sheet_id: sheetId,
              position: nextPosition,
              metadata: { created_by: userId },
              is_deleted: false,
            },
          ])
          .select()
          .single()

        if (error) {
          if (error.code === "23505" && retryCount < maxRetries - 1) {
            // Unique constraint violation, retry
            retryCount++
            await new Promise((resolve) => setTimeout(resolve, 100 * retryCount))
            continue
          }
          throw error
        }

        return { ...newRowFallback, cells: {} }
      } catch (err: any) {
        if (err.code === "23505" && retryCount < maxRetries - 1) {
          retryCount++
          await new Promise((resolve) => setTimeout(resolve, 100 * retryCount))
          continue
        }
        console.error("Exception in addRowSafely:", err)
        break
      }
    }

    // Final fallback: use timestamp-based position
    try {
      const timestampPosition = Date.now()
      const { data: newRow, error } = await this.supabase
        .from("rows")
        .insert([
          {
            sheet_id: sheetId,
            position: timestampPosition,
            metadata: { created_by: userId, fallback_position: true },
            is_deleted: false,
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("Error with timestamp position:", error)
        return null
      }

      return { ...newRow, cells: {} }
    } catch (err) {
      console.error("Final fallback failed:", err)
      return null
    }
  }

  // Bulk update cells
  async bulkUpdateCells(
    updates: Array<{
      row_id: string
      column_id: string
      value: any
      formatted_value?: string
    }>,
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc("bulk_update_cells", {
        updates: JSON.stringify(updates),
      })

      if (error) {
        console.error("Error in bulk update:", error)
        return false
      }

      return data?.success || true
    } catch (err) {
      console.error("Exception in bulkUpdateCells:", err)
      return false
    }
  }

  // Optimized search
  async searchSheetData(
    sheetId: string,
    searchTerm: string,
    columnFilters: Record<string, string> = {},
  ): Promise<string[]> {
    try {
      const { data, error } = await this.supabase.rpc("search_sheet_data", {
        sheet_id_param: sheetId,
        search_term: searchTerm,
        column_filters: JSON.stringify(columnFilters),
      })

      if (error) {
        console.error("Error in search:", error)
        return []
      }

      return data || []
    } catch (err) {
      console.error("Exception in searchSheetData:", err)
      return []
    }
  }

  // Add new column
  async addColumn(sheetId: string, columnData: Partial<ColumnData>, userId: string): Promise<ColumnData | null> {
    try {
      // Get last position
      const { data: lastColumn } = await this.supabase
        .from("columns")
        .select("position")
        .eq("sheet_id", sheetId)
        .order("position", { ascending: false })
        .limit(1)
        .single()

      const newPosition = lastColumn ? lastColumn.position + 1 : 0

      const { data: newColumn, error } = await this.supabase
        .from("columns")
        .insert([
          {
            sheet_id: sheetId,
            position: newPosition,
            width: 120,
            is_required: false,
            is_unique: false,
            validation_rules: {},
            format_options: {},
            ...columnData,
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("Error adding column:", error)
        return null
      }

      // Log action in history
      await this.logAction(sheetId, userId, "add_column", {
        column_name: columnData.name,
        column_type: columnData.type,
      })

      return newColumn
    } catch (err) {
      console.error("Exception in addColumn:", err)
      return null
    }
  }

  // Add new row using safe method
  async addRow(sheetId: string, userId: string): Promise<RowData | null> {
    const newRow = await this.addRowSafely(sheetId, userId)

    if (!newRow) {
      return null
    }

    // Get columns to create default cells if not already created
    const { data: columns } = await this.supabase
      .from("columns")
      .select("id, type, default_value")
      .eq("sheet_id", sheetId)

    if (columns && columns.length > 0 && Object.keys(newRow.cells).length === 0) {
      const cells = columns.map((column) => ({
        row_id: newRow.id,
        column_id: column.id,
        value: this.getDefaultValue(column.type, column.default_value),
        validation_status: "valid" as const,
      }))

      await this.supabase.from("cells").insert(cells)

      // Update the cells in the returned object
      newRow.cells = columns.reduce(
        (acc, col) => {
          acc[col.id] = this.getDefaultValue(col.type, col.default_value)
          return acc
        },
        {} as Record<string, any>,
      )
    }

    return newRow
  }

  // Delete row (soft delete)
  async deleteRow(rowId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.from("rows").update({ is_deleted: true }).eq("id", rowId)

      if (error) {
        console.error("Error deleting row:", error)
        return false
      }

      return true
    } catch (err) {
      console.error("Exception in deleteRow:", err)
      return false
    }
  }

  // Get sheet stats
  async getSheetStats(sheetId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase.from("sheet_stats").select("*").eq("sheet_id", sheetId).single()

      if (error) {
        console.error("Error fetching stats:", error)
        return null
      }

      return data
    } catch (err) {
      console.error("Exception in getSheetStats:", err)
      return null
    }
  }

  // Create public link
  async createPublicLink(
    sheetId: string,
    userId: string,
    permissions: any = { can_view: true, can_edit: false, can_download: false },
    expiresAt?: string,
  ): Promise<string | null> {
    try {
      const accessKey = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 15)}`

      const { data, error } = await this.supabase
        .from("public_links")
        .insert([
          {
            sheet_id: sheetId,
            access_key: accessKey,
            created_by: userId,
            permissions,
            expires_at: expiresAt,
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("Error creating public link:", error)
        return null
      }

      return accessKey
    } catch (err) {
      console.error("Exception in createPublicLink:", err)
      return null
    }
  }

  // Log action in history
  private async logAction(sheetId: string, userId: string, action: string, details: any): Promise<void> {
    try {
      await this.supabase.from("sheet_history").insert([
        {
          sheet_id: sheetId,
          user_id: userId,
          action,
          details,
        },
      ])
    } catch (err) {
      console.error("Error logging action:", err)
    }
  }

  // Get default value based on column type
  private getDefaultValue(type: string, defaultValue?: string): any {
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

  // Cleanup old data
  async cleanupOldData(): Promise<boolean> {
    try {
      const { error } = await this.supabase.rpc("cleanup_old_data")

      if (error) {
        console.error("Error in cleanup:", error)
        return false
      }

      return true
    } catch (err) {
      console.error("Exception in cleanupOldData:", err)
      return false
    }
  }
}

// Export instance
export const sheetsDB = new SheetsDatabase()
