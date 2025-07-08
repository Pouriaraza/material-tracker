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

  // دریافت بهینه داده‌های شیت
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

  // ایجاد شیت جدید
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

      // ایجاد ستون‌های پیش‌فرض
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
        ...col,
      }))

      await this.supabase.from("columns").insert(columnsToInsert)

      // ایجاد سطر اول خالی
      const { data: firstRow } = await this.supabase
        .from("rows")
        .insert([
          {
            sheet_id: sheet.id,
            position: 0,
            metadata: { created_by: userId },
          },
        ])
        .select()
        .single()

      // ثبت در تاریخچه
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

  // به‌روزرسانی دسته‌ای سلول‌ها
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

      return data.success
    } catch (err) {
      console.error("Exception in bulkUpdateCells:", err)
      return false
    }
  }

  // جستجوی بهینه
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

  // اضافه کردن ستون جدید
  async addColumn(sheetId: string, columnData: Partial<ColumnData>, userId: string): Promise<ColumnData | null> {
    try {
      // دریافت آخرین position
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

      // ثبت در تاریخچه
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

  // اضافه کردن سطر جدید
  async addRow(sheetId: string, userId: string): Promise<RowData | null> {
    try {
      // دریافت آخرین position
      const { data: lastRow } = await this.supabase
        .from("rows")
        .select("position")
        .eq("sheet_id", sheetId)
        .eq("is_deleted", false)
        .order("position", { ascending: false })
        .limit(1)
        .single()

      const newPosition = lastRow ? lastRow.position + 1 : 0

      const { data: newRow, error } = await this.supabase
        .from("rows")
        .insert([
          {
            sheet_id: sheetId,
            position: newPosition,
            metadata: { created_by: userId },
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("Error adding row:", error)
        return null
      }

      // دریافت ستون‌ها برای ایجاد سلول‌های پیش‌فرض
      const { data: columns } = await this.supabase
        .from("columns")
        .select("id, type, default_value")
        .eq("sheet_id", sheetId)

      if (columns && columns.length > 0) {
        const cells = columns.map((column) => ({
          row_id: newRow.id,
          column_id: column.id,
          value: JSON.stringify(this.getDefaultValue(column.type, column.default_value)),
          validation_status: "valid" as const,
        }))

        await this.supabase.from("cells").insert(cells)
      }

      return { ...newRow, cells: {} }
    } catch (err) {
      console.error("Exception in addRow:", err)
      return null
    }
  }

  // حذف سطر (soft delete)
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

  // دریافت آمار شیت
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

  // ایجاد لینک عمومی
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

  // ثبت عملیات در تاریخچه
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

  // دریافت مقدار پیش‌فرض بر اساس نوع ستون
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

  // پاک‌سازی داده‌های قدیمی
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

// صادر کردن instance
export const sheetsDB = new SheetsDatabase()
