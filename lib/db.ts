import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/database.types"

type Sheet = Database["public"]["Tables"]["sheets"]["Row"]
type Column = Database["public"]["Tables"]["columns"]["Row"]
type Row = Database["public"]["Tables"]["rows"]["Row"]
type Cell = Database["public"]["Tables"]["cells"]["Row"]

export async function getSheets(userId: string) {
  const supabase = createClient()

  // Get sheets owned by the user
  const { data: ownedSheets, error: ownedError } = await supabase
    .from("sheets")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })

  if (ownedError) {
    console.error("Error fetching owned sheets:", ownedError)
    return []
  }

  // Get sheets shared with the user
  const { data: sharedSheets, error: sharedError } = await supabase
    .from("sheet_permissions")
    .select(`
      sheet_id,
      sheets:sheet_id (*)
    `)
    .eq("user_id", userId)

  if (sharedError) {
    console.error("Error fetching shared sheets:", sharedError)
    return ownedSheets || []
  }

  // Combine owned and shared sheets
  const sharedSheetsData = sharedSheets?.map((item) => item.sheets) || []
  const allSheets = [...(ownedSheets || []), ...sharedSheetsData]

  // Remove duplicates
  const uniqueSheets = allSheets.filter((sheet, index, self) => index === self.findIndex((s) => s.id === sheet.id))

  return uniqueSheets
}

export async function getSheetById(sheetId: string, userId: string) {
  const supabase = createClient()

  // Check if user has access to this sheet
  const { data: sheet, error: sheetError } = await supabase.from("sheets").select("*").eq("id", sheetId).single()

  if (sheetError) {
    console.error("Error fetching sheet:", sheetError)
    return null
  }

  // If user is the owner, they have full access
  if (sheet.owner_id === userId) {
    return sheet
  }

  // If user is not the owner, check permissions
  const { data: permission, error: permissionError } = await supabase
    .from("sheet_permissions")
    .select("*")
    .eq("sheet_id", sheetId)
    .eq("user_id", userId)
    .single()

  if (permissionError || !permission) {
    console.error("User does not have permission to access this sheet")
    return null
  }

  return sheet
}

export async function getSheetColumns(sheetId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("columns")
    .select("*")
    .eq("sheet_id", sheetId)
    .order("position", { ascending: true })

  if (error) {
    console.error("Error fetching columns:", error)
    return []
  }

  return data
}

export async function getSheetRows(sheetId: string) {
  const supabase = createClient()

  const { data: rows, error: rowsError } = await supabase
    .from("rows")
    .select("*")
    .eq("sheet_id", sheetId)
    .order("position", { ascending: true })

  if (rowsError) {
    console.error("Error fetching rows:", rowsError)
    return []
  }

  // Get all cells for this sheet's rows
  const rowIds = rows.map((row) => row.id)

  if (rowIds.length === 0) {
    return []
  }

  const { data: cells, error: cellsError } = await supabase.from("cells").select("*").in("row_id", rowIds)

  if (cellsError) {
    console.error("Error fetching cells:", cellsError)
    return rows
  }

  // Group cells by row_id
  const cellsByRow: Record<string, Record<string, any>> = {}
  cells.forEach((cell) => {
    if (!cellsByRow[cell.row_id]) {
      cellsByRow[cell.row_id] = {}
    }
    cellsByRow[cell.row_id][cell.column_id] = cell.value
  })

  // Add cells to each row
  const rowsWithCells = rows.map((row) => ({
    ...row,
    cells: cellsByRow[row.id] || {},
  }))

  return rowsWithCells
}

export async function createSheet(name: string, userId: string) {
  const supabase = createClient()

  // Create the sheet
  const { data: sheet, error: sheetError } = await supabase
    .from("sheets")
    .insert([{ name, owner_id: userId }])
    .select()
    .single()

  if (sheetError) {
    console.error("Error creating sheet:", sheetError)
    return null
  }

  // Create default columns
  const defaultColumns = [
    { sheet_id: sheet.id, name: "Site ID", type: "text", position: 0 },
    { sheet_id: sheet.id, name: "Scenario", type: "text", position: 1 },
    { sheet_id: sheet.id, name: "MR Number", type: "text", position: 2 },
    { sheet_id: sheet.id, name: "IQF Number", type: "text", position: 3 },
    { sheet_id: sheet.id, name: "Status Delivery", type: "text", position: 4 },
    { sheet_id: sheet.id, name: "Approve Date", type: "date", position: 5 },
    { sheet_id: sheet.id, name: "Contractor Name", type: "text", position: 6 },
    { sheet_id: sheet.id, name: "Region", type: "text", position: 7 },
    { sheet_id: sheet.id, name: "Note", type: "text", position: 8 },
  ]

  const { error: columnsError } = await supabase.from("columns").insert(defaultColumns)

  if (columnsError) {
    console.error("Error creating default columns:", columnsError)
  }

  // Create first empty row
  const { data: row, error: rowError } = await supabase
    .from("rows")
    .insert([{ sheet_id: sheet.id, position: 0 }])
    .select()
    .single()

  if (rowError) {
    console.error("Error creating first row:", rowError)
  }

  return sheet
}

export async function updateSheetName(sheetId: string, name: string, userId: string) {
  const supabase = createClient()

  // Check if user is the owner
  const { data: sheet, error: sheetError } = await supabase.from("sheets").select("owner_id").eq("id", sheetId).single()

  if (sheetError || sheet.owner_id !== userId) {
    console.error("User does not have permission to update this sheet")
    return false
  }

  const { error } = await supabase.from("sheets").update({ name }).eq("id", sheetId)

  if (error) {
    console.error("Error updating sheet name:", error)
    return false
  }

  return true
}

export async function deleteSheet(sheetId: string, userId: string) {
  const supabase = createClient()

  try {
    // Check if user is the owner
    const { data: sheet, error: sheetError } = await supabase
      .from("sheets")
      .select("owner_id")
      .eq("id", sheetId)
      .single()

    if (sheetError) {
      console.error("Error fetching sheet:", sheetError)
      return false
    }

    if (sheet.owner_id !== userId) {
      console.error("User does not have permission to delete this sheet")
      return false
    }

    // First delete sheet permissions
    const { error: permissionsError } = await supabase.from("sheet_permissions").delete().eq("sheet_id", sheetId)

    if (permissionsError) {
      console.error("Error deleting sheet permissions:", permissionsError)
      // Continue with deletion even if permissions deletion fails
    }

    // Delete the sheet (cascade will delete related columns, rows, and cells)
    const { error } = await supabase.from("sheets").delete().eq("id", sheetId)

    if (error) {
      console.error("Error deleting sheet:", error)
      return false
    }

    console.log(`Sheet ${sheetId} successfully deleted`)
    return true
  } catch (err) {
    console.error("Unexpected error deleting sheet:", err)
    return false
  }
}

export async function addColumn(
  sheetId: string,
  name: string,
  type: "text" | "number" | "date" | "checkbox",
  userId: string,
) {
  const supabase = createClient()

  // Check if user has edit permission
  const { data: sheet, error: sheetError } = await supabase.from("sheets").select("owner_id").eq("id", sheetId).single()

  if (sheetError) {
    console.error("Error fetching sheet:", sheetError)
    return null
  }

  let hasEditPermission = sheet.owner_id === userId

  if (!hasEditPermission) {
    const { data: permission, error: permissionError } = await supabase
      .from("sheet_permissions")
      .select("role_id")
      .eq("sheet_id", sheetId)
      .eq("user_id", userId)
      .single()

    if (permissionError) {
      console.error("Error checking permissions:", permissionError)
      return null
    }

    // Get role name
    const { data: role, error: roleError } = await supabase
      .from("user_roles")
      .select("name")
      .eq("id", permission.role_id)
      .single()

    if (roleError) {
      console.error("Error fetching role:", roleError)
      return null
    }

    hasEditPermission = role.name === "admin" || role.name === "editor"
  }

  if (!hasEditPermission) {
    console.error("User does not have permission to add columns")
    return null
  }

  // Get the highest position
  const { data: columns, error: columnsError } = await supabase
    .from("columns")
    .select("position")
    .eq("sheet_id", sheetId)
    .order("position", { ascending: false })
    .limit(1)

  if (columnsError) {
    console.error("Error fetching columns:", columnsError)
    return null
  }

  const position = columns.length > 0 ? columns[0].position + 1 : 0

  // Add the new column
  const { data: newColumn, error } = await supabase
    .from("columns")
    .insert([{ sheet_id: sheetId, name, type, position }])
    .select()
    .single()

  if (error) {
    console.error("Error adding column:", error)
    return null
  }

  return newColumn
}

export async function updateColumns(sheetId: string, columns: any[], userId: string) {
  const supabase = createClient()

  // Check if user has edit permission
  const { data: sheet, error: sheetError } = await supabase.from("sheets").select("owner_id").eq("id", sheetId).single()

  if (sheetError) {
    console.error("Error fetching sheet:", sheetError)
    return false
  }

  let hasEditPermission = sheet.owner_id === userId

  if (!hasEditPermission) {
    const { data: permission, error: permissionError } = await supabase
      .from("sheet_permissions")
      .select("role_id")
      .eq("sheet_id", sheetId)
      .eq("user_id", userId)
      .single()

    if (permissionError) {
      console.error("Error checking permissions:", permissionError)
      return false
    }

    // Get role name
    const { data: role, error: roleError } = await supabase
      .from("user_roles")
      .select("name")
      .eq("id", permission.role_id)
      .single()

    if (roleError) {
      console.error("Error fetching role:", roleError)
      return false
    }

    hasEditPermission = role.name === "admin" || role.name === "editor"
  }

  if (!hasEditPermission) {
    console.error("User does not have permission to update columns")
    return false
  }

  // Get existing columns
  const { data: existingColumns, error: columnsError } = await supabase
    .from("columns")
    .select("id")
    .eq("sheet_id", sheetId)

  if (columnsError) {
    console.error("Error fetching existing columns:", columnsError)
    return false
  }

  const existingIds = existingColumns.map((col) => col.id)
  const newIds = columns.map((col) => col.id)

  // Find columns to delete
  const idsToDelete = existingIds.filter((id) => !newIds.includes(id))

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase.from("columns").delete().in("id", idsToDelete)

    if (deleteError) {
      console.error("Error deleting columns:", deleteError)
      return false
    }
  }

  // Update or insert columns
  for (const column of columns) {
    if (existingIds.includes(column.id)) {
      // Update existing column
      const { error: updateError } = await supabase
        .from("columns")
        .update({
          name: column.name,
          type: column.type,
          position: column.position,
          width: column.width,
        })
        .eq("id", column.id)

      if (updateError) {
        console.error("Error updating column:", updateError)
        return false
      }
    } else {
      // Insert new column
      const { error: insertError } = await supabase.from("columns").insert([
        {
          id: column.id,
          sheet_id: sheetId,
          name: column.name,
          type: column.type,
          position: column.position,
          width: column.width,
        },
      ])

      if (insertError) {
        console.error("Error inserting column:", insertError)
        return false
      }
    }
  }

  return true
}

export async function addRow(sheetId: string, userId: string) {
  const supabase = createClient()

  // Check if user has edit permission
  const { data: sheet, error: sheetError } = await supabase.from("sheets").select("owner_id").eq("id", sheetId).single()

  if (sheetError) {
    console.error("Error fetching sheet:", sheetError)
    return null
  }

  let hasEditPermission = sheet.owner_id === userId

  if (!hasEditPermission) {
    const { data: permission, error: permissionError } = await supabase
      .from("sheet_permissions")
      .select("role_id")
      .eq("sheet_id", sheetId)
      .eq("user_id", userId)
      .single()

    if (permissionError) {
      console.error("Error checking permissions:", permissionError)
      return null
    }

    // Get role name
    const { data: role, error: roleError } = await supabase
      .from("user_roles")
      .select("name")
      .eq("id", permission.role_id)
      .single()

    if (roleError) {
      console.error("Error fetching role:", roleError)
      return null
    }

    hasEditPermission = role.name === "admin" || role.name === "editor"
  }

  if (!hasEditPermission) {
    console.error("User does not have permission to add rows")
    return null
  }

  // Get the highest position
  const { data: rows, error: rowsError } = await supabase
    .from("rows")
    .select("position")
    .eq("sheet_id", sheetId)
    .order("position", { ascending: false })
    .limit(1)

  if (rowsError) {
    console.error("Error fetching rows:", rowsError)
    return null
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
    return null
  }

  // Get columns to initialize cells
  const { data: columns, error: columnsError } = await supabase
    .from("columns")
    .select("id, type")
    .eq("sheet_id", sheetId)

  if (columnsError) {
    console.error("Error fetching columns:", columnsError)
    return newRow
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

  return newRow
}

export async function updateCell(rowId: string, columnId: string, value: any, userId: string) {
  const supabase = createClient()

  // Get the sheet_id from the row
  const { data: row, error: rowError } = await supabase.from("rows").select("sheet_id").eq("id", rowId).single()

  if (rowError) {
    console.error("Error fetching row:", rowError)
    return false
  }

  // Check if user has edit permission
  const { data: sheet, error: sheetError } = await supabase
    .from("sheets")
    .select("owner_id")
    .eq("id", row.sheet_id)
    .single()

  if (sheetError) {
    console.error("Error fetching sheet:", sheetError)
    return false
  }

  let hasEditPermission = sheet.owner_id === userId

  if (!hasEditPermission) {
    const { data: permission, error: permissionError } = await supabase
      .from("sheet_permissions")
      .select("role_id")
      .eq("sheet_id", row.sheet_id)
      .eq("user_id", userId)
      .single()

    if (permissionError) {
      console.error("Error checking permissions:", permissionError)
      return false
    }

    // Get role name
    const { data: role, error: roleError } = await supabase
      .from("user_roles")
      .select("name")
      .eq("id", permission.role_id)
      .single()

    if (roleError) {
      console.error("Error fetching role:", roleError)
      return false
    }

    hasEditPermission = role.name === "admin" || role.name === "editor"
  }

  if (!hasEditPermission) {
    console.error("User does not have permission to update cells")
    return false
  }

  // Check if cell exists
  const { data: cell, error: cellError } = await supabase
    .from("cells")
    .select("id")
    .eq("row_id", rowId)
    .eq("column_id", columnId)
    .maybeSingle()

  if (cellError) {
    console.error("Error checking cell:", cellError)
    return false
  }

  if (cell) {
    // Update existing cell
    const { error: updateError } = await supabase.from("cells").update({ value }).eq("id", cell.id)

    if (updateError) {
      console.error("Error updating cell:", updateError)
      return false
    }
  } else {
    // Insert new cell
    const { error: insertError } = await supabase.from("cells").insert([{ row_id: rowId, column_id: columnId, value }])

    if (insertError) {
      console.error("Error inserting cell:", insertError)
      return false
    }
  }

  return true
}

export async function deleteRow(rowId: string, userId: string) {
  const supabase = createClient()

  // Get the sheet_id from the row
  const { data: row, error: rowError } = await supabase.from("rows").select("sheet_id").eq("id", rowId).single()

  if (rowError) {
    console.error("Error fetching row:", rowError)
    return false
  }

  // Check if user has edit permission
  const { data: sheet, error: sheetError } = await supabase
    .from("sheets")
    .select("owner_id")
    .eq("id", row.sheet_id)
    .single()

  if (sheetError) {
    console.error("Error fetching sheet:", sheetError)
    return false
  }

  let hasEditPermission = sheet.owner_id === userId

  if (!hasEditPermission) {
    const { data: permission, error: permissionError } = await supabase
      .from("sheet_permissions")
      .select("role_id")
      .eq("sheet_id", row.sheet_id)
      .eq("user_id", userId)
      .single()

    if (permissionError) {
      console.error("Error checking permissions:", permissionError)
      return false
    }

    // Get role name
    const { data: role, error: roleError } = await supabase
      .from("user_roles")
      .select("name")
      .eq("id", permission.role_id)
      .single()

    if (roleError) {
      console.error("Error fetching role:", roleError)
      return false
    }

    hasEditPermission = role.name === "admin" || role.name === "editor"
  }

  if (!hasEditPermission) {
    console.error("User does not have permission to delete rows")
    return false
  }

  // Delete the row (cascade will delete related cells)
  const { error } = await supabase.from("rows").delete().eq("id", rowId)

  if (error) {
    console.error("Error deleting row:", error)
    return false
  }

  return true
}

export async function shareSheet(sheetId: string, userEmail: string, roleName: string, userId: string) {
  const supabase = createClient()

  // Check if user is the owner or has admin permissions
  const { data: sheet, error: sheetError } = await supabase.from("sheets").select("owner_id").eq("id", sheetId).single()

  if (sheetError) {
    console.error("Error fetching sheet:", sheetError)
    return false
  }

  let hasSharePermission = sheet.owner_id === userId

  if (!hasSharePermission) {
    // Check if user has admin role for this sheet
    const { data: permission, error: permissionError } = await supabase
      .from("sheet_permissions")
      .select("role_id")
      .eq("sheet_id", sheetId)
      .eq("user_id", userId)
      .single()

    if (permissionError) {
      console.error("Error checking permissions:", permissionError)
      return false
    }

    // Get role name
    const { data: role, error: roleError } = await supabase
      .from("user_roles")
      .select("name")
      .eq("id", permission.role_id)
      .single()

    if (roleError) {
      console.error("Error fetching role:", roleError)
      return false
    }

    hasSharePermission = role.name === "admin"
  }

  if (!hasSharePermission) {
    console.error("User does not have permission to share this sheet")
    return false
  }

  // Get the user to share with from profiles table
  const { data: targetUser, error: userError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", userEmail)
    .single()

  if (userError) {
    console.error("User not found:", userError)
    return false
  }

  // Get the role ID
  const { data: role, error: roleError } = await supabase.from("user_roles").select("id").eq("name", roleName).single()

  if (roleError) {
    console.error("Role not found:", roleError)
    return false
  }

  // Check if permission already exists
  const { data: existingPermission, error: permissionError } = await supabase
    .from("sheet_permissions")
    .select("id")
    .eq("sheet_id", sheetId)
    .eq("user_id", targetUser.id)
    .maybeSingle()

  if (permissionError && !permissionError.message.includes("No rows found")) {
    console.error("Error checking existing permission:", permissionError)
    return false
  }

  if (existingPermission) {
    // Update existing permission
    const { error: updateError } = await supabase
      .from("sheet_permissions")
      .update({ role_id: role.id })
      .eq("id", existingPermission.id)

    if (updateError) {
      console.error("Error updating permission:", updateError)
      return false
    }
  } else {
    // Create new permission
    const { error: insertError } = await supabase.from("sheet_permissions").insert([
      {
        sheet_id: sheetId,
        user_id: targetUser.id,
        role_id: role.id,
      },
    ])

    if (insertError) {
      console.error("Error creating permission:", insertError)
      return false
    }
  }

  return true
}
