"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ExcelSheet } from "@/components/excel-sheet"
import { ColumnManagementDialog } from "@/components/column-management-dialog"
import {
  Plus,
  FileUp,
  FileDown,
  Search,
  Settings,
  ArrowLeft,
  Share2,
  ListChecks,
  UserPlus,
  Pencil,
  Check,
  X,
  Save,
} from "lucide-react"
import Link from "next/link"
import * as XLSX from "xlsx"
import { DeleteSheetButton } from "@/components/delete-sheet-button"
import { ShareLinkDialog } from "@/components/share-link-dialog"
import SheetPermissionsDialog from "@/components/sheet-permissions-dialog"
import { SheetPermissionsBadge } from "@/components/sheet-permissions-badge"
import { toast } from "@/components/ui/use-toast"

interface Column {
  id: string
  name: string
  type: "text" | "number" | "date" | "checkbox"
  width?: number
}

interface Row {
  id: string
  cells: Record<string, any>
}

interface ColumnFilter {
  columnId: string
  value: string
}

interface PendingChange {
  rowId: string
  columnId: string
  value: any
}

export default function SheetPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [sheet, setSheet] = useState<any>(null)
  const [columns, setColumns] = useState<Column[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showColumnManagementDialog, setShowColumnManagementDialog] = useState(false)
  const [showShareLinkDialog, setShowShareLinkDialog] = useState(false)
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false)
  const [globalSearchTerm, setGlobalSearchTerm] = useState("")
  const [columnFilters, setColumnFilters] = useState<ColumnFilter[]>([])
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null)
  const [publicLink, setPublicLink] = useState<string | null>(null)
  const [isPublicLinkActive, setIsPublicLinkActive] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [newSheetName, setNewSheetName] = useState("")
  const [isRenamingSheet, setIsRenamingSheet] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [autoSave, setAutoSave] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      setUser(user)
      loadSheet(user.id)
    }

    checkAuth()
  }, [params.id])

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [isEditingName])

  // Auto-save changes after a delay
  useEffect(() => {
    if (!autoSave || pendingChanges.length === 0) return

    const timer = setTimeout(() => {
      saveChanges()
    }, 3000) // Auto-save after 3 seconds of inactivity

    return () => clearTimeout(timer)
  }, [pendingChanges, autoSave])

  const loadSheet = async (userId: string) => {
    setLoading(true)
    setError(null)

    try {
      // Get sheet
      const { data: sheet, error: sheetError } = await supabase.from("sheets").select("*").eq("id", params.id).single()

      if (sheetError) {
        setError("Sheet not found")
        setLoading(false)
        return
      }

      // Check if user has access
      if (sheet.owner_id !== userId) {
        const { data: permission, error: permissionError } = await supabase
          .from("sheet_permissions")
          .select("*")
          .eq("sheet_id", params.id)
          .eq("user_id", userId)
          .single()

        if (permissionError) {
          setError("You don't have permission to access this sheet")
          setLoading(false)
          return
        }
      }

      setSheet(sheet)
      setNewSheetName(sheet.name)

      // Get columns
      const { data: columns, error: columnsError } = await supabase
        .from("columns")
        .select("*")
        .eq("sheet_id", params.id)
        .order("position", { ascending: true })

      if (columnsError) {
        setError("Failed to load columns")
        setLoading(false)
        return
      }

      setColumns(columns)

      // Get rows
      const { data: rows, error: rowsError } = await supabase
        .from("rows")
        .select("*")
        .eq("sheet_id", params.id)
        .order("position", { ascending: true })

      if (rowsError) {
        setError("Failed to load rows")
        setLoading(false)
        return
      }

      // Get cells for all rows
      const rowIds = rows.map((row) => row.id)

      if (rowIds.length === 0) {
        setRows([])
        setLoading(false)
        return
      }

      const { data: cells, error: cellsError } = await supabase.from("cells").select("*").in("row_id", rowIds)

      if (cellsError) {
        setError("Failed to load cells")
        setLoading(false)
        return
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

      setRows(rowsWithCells)

      // Check if public link exists
      try {
        const { data: publicLinkData, error: publicLinkError } = await supabase
          .from("public_links")
          .select("*")
          .eq("sheet_id", params.id)
          .maybeSingle()

        if (!publicLinkError && publicLinkData) {
          setPublicLink(`${window.location.origin}/public/sheets/${publicLinkData.access_key}`)
          setIsPublicLinkActive(publicLinkData.is_active)
        }
      } catch (err) {
        console.log("Note: public_links table might not exist yet")
        // This is fine, we'll just assume no public link exists
      }
    } catch (err) {
      console.error("Error loading sheet:", err)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const startEditingName = () => {
    setIsEditingName(true)
  }

  const cancelEditingName = () => {
    setIsEditingName(false)
    setNewSheetName(sheet.name)
  }

  const saveSheetName = async () => {
    if (!user || !sheet || newSheetName.trim() === "") return
    if (newSheetName === sheet.name) {
      setIsEditingName(false)
      return
    }

    setIsRenamingSheet(true)

    try {
      const { error } = await supabase.from("sheets").update({ name: newSheetName.trim() }).eq("id", sheet.id)

      if (error) {
        throw new Error(`Failed to rename sheet: ${error.message}`)
      }

      // Update local state
      setSheet({ ...sheet, name: newSheetName.trim() })
      setIsEditingName(false)
      toast({
        title: "Sheet renamed",
        description: `Sheet has been renamed to "${newSheetName.trim()}"`,
      })
    } catch (err: any) {
      console.error("Error renaming sheet:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to rename sheet",
        variant: "destructive",
      })
    } finally {
      setIsRenamingSheet(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveSheetName()
    } else if (e.key === "Escape") {
      cancelEditingName()
    }
  }

  const addNewRow = async () => {
    if (!user) return

    try {
      // Create new row in database
      const { data: newRow, error } = await supabase
        .from("rows")
        .insert([
          {
            sheet_id: params.id,
            position: rows.length,
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("Error adding row:", error)
        return
      }

      // Initialize cells for all columns
      const cells = columns.map((column) => {
        let defaultValue: any = null

        if (column.type === "date") {
          defaultValue = new Date().toISOString().split("T")[0]
        } else if (column.type === "number") {
          defaultValue = 0
        } else if (column.type === "checkbox") {
          defaultValue = false
        } else if (column.name.toLowerCase() === "status" || column.name.toLowerCase().includes("status")) {
          defaultValue = "Pending" // Default status value
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
        await supabase.from("cells").insert(cells)
      }

      // Add row to state
      const newRowWithCells = {
        ...newRow,
        cells: columns.reduce((acc, column) => {
          let defaultValue: any = null

          if (column.type === "date") {
            defaultValue = new Date().toISOString().split("T")[0]
          } else if (column.type === "number") {
            defaultValue = 0
          } else if (column.type === "checkbox") {
            defaultValue = false
          } else if (column.name.toLowerCase() === "status" || column.name.toLowerCase().includes("status")) {
            defaultValue = "Pending" // Default status value
          } else {
            defaultValue = ""
          }

          return { ...acc, [column.id]: defaultValue }
        }, {}),
      }

      setRows([...rows, newRowWithCells])
    } catch (err) {
      console.error("Error adding row:", err)
    }
  }

  const addStatusColumn = async () => {
    if (!user) return

    try {
      // Get the highest position
      const position = columns.length > 0 ? Math.max(...columns.map((col) => col.position)) + 1 : 0

      // Create new column in database
      const { data: newColumn, error } = await supabase
        .from("columns")
        .insert([
          {
            sheet_id: params.id,
            name: "Status",
            type: "text",
            position: position,
            width: 120,
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("Error adding status column:", error)
        return
      }

      // Initialize cells for all rows with default "Pending" status
      const cells = rows.map((row) => ({
        row_id: row.id,
        column_id: newColumn.id,
        value: "Pending",
      }))

      if (cells.length > 0) {
        await supabase.from("cells").insert(cells)
      }

      // Update rows in state with new cells
      const updatedRows = rows.map((row) => ({
        ...row,
        cells: {
          ...row.cells,
          [newColumn.id]: "Pending",
        },
      }))

      // Update columns and rows in state
      setColumns([...columns, newColumn])
      setRows(updatedRows)
    } catch (err) {
      console.error("Error adding status column:", err)
    }
  }

  const updateColumns = async (updatedColumns: Column[]) => {
    if (!user) return

    try {
      // Update columns in database
      for (let index = 0; index < updatedColumns.length; index++) {
        const column = updatedColumns[index]
        await supabase.from("columns").upsert({
          id: column.id,
          sheet_id: params.id,
          name: column.name,
          type: column.type,
          position: index, // استفاده از index به جای findIndex
          width: column.width || 120,
        })
      }

      // Get deleted column IDs
      const deletedColumnIds = columns
        .filter((col) => !updatedColumns.some((updatedCol) => updatedCol.id === col.id))
        .map((col) => col.id)

      // Delete removed columns
      if (deletedColumnIds.length > 0) {
        await supabase.from("columns").delete().in("id", deletedColumnIds)
      }

      // Update state
      setColumns(updatedColumns)

      // Update rows to handle added/removed columns
      const updatedRows = rows.map((row) => {
        const updatedCells = { ...row.cells }

        // Remove cells for deleted columns
        deletedColumnIds.forEach((columnId) => {
          delete updatedCells[columnId]
        })

        // Add cells for new columns
        updatedColumns.forEach((column) => {
          if (!row.cells[column.id]) {
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

            updatedCells[column.id] = defaultValue
          }
        })

        return {
          ...row,
          cells: updatedCells,
        }
      })

      setRows(updatedRows)

      // نمایش پیام موفقیت
      toast({
        title: "Columns updated",
        description: "Column changes have been saved successfully",
      })
    } catch (err) {
      console.error("Error updating columns:", err)
      toast({
        title: "Error",
        description: "Failed to update columns. Please try again.",
        variant: "destructive",
      })
    }
  }

  const updateCell = async (rowId: string, columnId: string, value: any) => {
    if (!user) return

    // Update the cell in the UI immediately
    setRows(
      rows.map((row) => {
        if (row.id === rowId) {
          return {
            ...row,
            cells: {
              ...row.cells,
              [columnId]: value,
            },
          }
        }
        return row
      }),
    )

    // Add to pending changes
    setPendingChanges((prev) => {
      // Remove any existing change for this cell
      const filtered = prev.filter((change) => !(change.rowId === rowId && change.columnId === columnId))

      // Add the new change
      return [...filtered, { rowId, columnId, value }]
    })

    // If auto-save is disabled, we're done
    if (!autoSave) return

    // Otherwise, the auto-save effect will handle saving
  }

  const saveChanges = async () => {
    if (pendingChanges.length === 0) return

    setIsSaving(true)
    const changesToSave = [...pendingChanges]

    try {
      // Process changes in batches to avoid overwhelming the database
      const batchSize = 50
      for (let i = 0; i < changesToSave.length; i += batchSize) {
        const batch = changesToSave.slice(i, i + batchSize)

        // Process each change in the batch
        await Promise.all(
          batch.map(async (change) => {
            const { rowId, columnId, value } = change

            // Check if cell exists
            const { data: cell, error: cellError } = await supabase
              .from("cells")
              .select("id")
              .eq("row_id", rowId)
              .eq("column_id", columnId)
              .maybeSingle()

            if (cellError) {
              console.error("Error checking cell:", cellError)
              return
            }

            if (cell) {
              // Update existing cell
              await supabase.from("cells").update({ value }).eq("id", cell.id)
            } else {
              // Insert new cell
              await supabase.from("cells").insert([{ row_id: rowId, column_id: columnId, value }])
            }
          }),
        )
      }

      // Clear the pending changes that were saved
      setPendingChanges((prev) =>
        prev.filter(
          (change) =>
            !changesToSave.some(
              (savedChange) => savedChange.rowId === change.rowId && savedChange.columnId === change.columnId,
            ),
        ),
      )

      toast({
        title: "Changes saved",
        description: `Successfully saved ${changesToSave.length} changes`,
      })
    } catch (err) {
      console.error("Error saving changes:", err)
      toast({
        title: "Error saving changes",
        description: "Some changes could not be saved. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleAutoSave = () => {
    setAutoSave(!autoSave)
    toast({
      title: autoSave ? "Auto-save disabled" : "Auto-save enabled",
      description: autoSave
        ? "Changes will not be saved automatically. Click the Save button to save changes."
        : "Changes will be saved automatically after a few seconds.",
    })
  }

  const toggleStatus = async (rowId: string, columnId: string, currentValue: string) => {
    // Define the status cycle: Pending -> Done -> Problem -> Pending
    const statusCycle: Record<string, string> = {
      Pending: "Done",
      Done: "Problem",
      Problem: "Pending",
    }

    // Get the next status
    const nextStatus = statusCycle[currentValue] || "Pending"

    // Update the cell with the new status
    await updateCell(rowId, columnId, nextStatus)
  }

  const deleteRow = async (rowId: string) => {
    if (!user) return

    try {
      // Delete row from database
      await supabase.from("rows").delete().eq("id", rowId)

      // Update state
      setRows(rows.filter((row) => row.id !== rowId))

      // Remove any pending changes for this row
      setPendingChanges(pendingChanges.filter((change) => change.rowId !== rowId))
    } catch (err) {
      console.error("Error deleting row:", err)
    }
  }

  const exportToExcel = () => {
    if (!sheet || !columns.length) return

    // Create a new workbook
    const workbook = XLSX.utils.book_new()

    // Create headers row
    const headers = columns.map((col) => col.name)

    // Create data rows
    const data = rows.map((row) => {
      return columns.map((column) => {
        const value = row.cells[column.id]

        // Format based on column type
        if (column.type === "checkbox") {
          return value ? "Yes" : "No"
        } else if (column.type === "date" && value) {
          return value // Excel will recognize ISO date strings
        } else {
          return value !== undefined && value !== null ? value : ""
        }
      })
    })

    // Combine headers and data
    const sheetData = [headers, ...data]

    // Create worksheet and add to workbook
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name)

    // Generate Excel file in browser-compatible way
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

    // Create a Blob from the buffer
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })

    // Create download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${sheet.name}.xlsx`

    // Trigger download
    document.body.appendChild(link)
    link.click()

    // Clean up
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const importFromExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })

        if (workbook.SheetNames.length === 0) {
          console.error("No sheets found in Excel file")
          return
        }

        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { header: 1 })

        if (rawData.length < 2) {
          console.error("Excel file must have headers and at least one data row")
          return
        }

        // First row is headers
        const headerRow = rawData[0] as string[]

        // Create or update columns
        const updatedColumns: Column[] = []

        for (let i = 0; i < headerRow.length; i++) {
          const headerName = headerRow[i]

          // Find existing column with this name
          const existingColumn = columns.find((col) => col.name === headerName)

          if (existingColumn) {
            updatedColumns.push(existingColumn)
          } else {
            // Create new column - استفاده از crypto.randomUUID()
            const newColumn: Column = {
              id: crypto.randomUUID(),
              name: headerName,
              type: "text", // Default to text
              width: 120,
            }
            updatedColumns.push(newColumn)
          }
        }

        // Update columns in database
        await Promise.all(
          updatedColumns.map((column, index) =>
            supabase.from("columns").upsert({
              id: column.id,
              sheet_id: params.id,
              name: column.name,
              type: column.type,
              position: index,
              width: column.width,
            }),
          ),
        )

        // Delete any columns not in the new data
        const columnsToKeep = new Set(updatedColumns.map((col) => col.id))
        const columnsToDelete = columns.filter((col) => !columnsToKeep.has(col.id))

        if (columnsToDelete.length > 0) {
          await supabase
            .from("columns")
            .delete()
            .in(
              "id",
              columnsToDelete.map((col) => col.id),
            )
        }

        // Delete existing rows
        await supabase.from("rows").delete().eq("sheet_id", params.id)

        // Create new rows
        const newRows: Row[] = []

        for (let i = 1; i < rawData.length; i++) {
          const rowData = rawData[i] as any[]
          if (!rowData.length) continue

          // Create row
          const { data: newRow, error: rowError } = await supabase
            .from("rows")
            .insert([
              {
                sheet_id: params.id,
                position: i - 1,
              },
            ])
            .select()
            .single()

          if (rowError) {
            console.error("Error creating row:", rowError)
            continue
          }

          // Create cells
          const cells = []
          const cellsObj: Record<string, any> = {}

          for (let j = 0; j < Math.min(rowData.length, updatedColumns.length); j++) {
            const value = rowData[j] !== undefined ? rowData[j] : ""
            cells.push({
              row_id: newRow.id,
              column_id: updatedColumns[j].id,
              value,
            })
            cellsObj[updatedColumns[j].id] = value
          }

          if (cells.length > 0) {
            await supabase.from("cells").insert(cells)
          }

          newRows.push({
            ...newRow,
            cells: cellsObj,
          })
        }

        // Update state
        setColumns(updatedColumns)
        setRows(newRows)
        setPendingChanges([]) // Clear pending changes after import
      } catch (error) {
        console.error("Error importing Excel data:", error)
      }
    }
    reader.readAsArrayBuffer(file)
    // Reset the input
    event.target.value = ""
  }

  const handleColumnFilterChange = (columnId: string, value: string) => {
    // Update existing filter or add new one
    const existingFilterIndex = columnFilters.findIndex((filter) => filter.columnId === columnId)

    if (existingFilterIndex >= 0) {
      const updatedFilters = [...columnFilters]
      if (value) {
        updatedFilters[existingFilterIndex] = { columnId, value }
      } else {
        // Remove filter if value is empty
        updatedFilters.splice(existingFilterIndex, 1)
      }
      setColumnFilters(updatedFilters)
    } else if (value) {
      setColumnFilters([...columnFilters, { columnId, value }])
    }
  }

  const clearAllFilters = () => {
    setGlobalSearchTerm("")
    setColumnFilters([])
  }

  // SIMPLIFIED PUBLIC LINK CREATION
  const createPublicLinkHandler = async () => {
    if (!user || !sheet) return

    try {
      // First, try to create the public_links table
      try {
        // Try to create the table via API
        const response = await fetch("/api/setup-public-links-table", {
          method: "POST",
        })

        console.log("Table creation response:", await response.json().catch(() => ({})))
      } catch (err) {
        console.log("Note: Error creating table, continuing anyway:", err)
      }

      // Generate a unique access key
      const accessKey = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`

      // Check if a link already exists for this sheet
      let existingLink = null
      let checkError = null

      try {
        const result = await supabase.from("public_links").select("id").eq("sheet_id", params.id).maybeSingle()

        existingLink = result.data
        checkError = result.error
      } catch (err) {
        console.log("Error checking for existing link:", err)
        checkError = err
      }

      // If there's an error and it's not just "no rows returned"
      if (checkError && checkError.message && !checkError.message.includes("no rows")) {
        console.log("Check error:", checkError)

        // If the error is about the table not existing, we'll try to create it directly
        if (checkError.message.includes("does not exist")) {
          console.log("Table does not exist, trying direct SQL creation")

          // Try to create the table using direct SQL
          try {
            // Create the table directly using SQL
            await fetch("/api/setup-public-links-table", {
              method: "POST",
            })
          } catch (err) {
            console.error("Failed to create table via API:", err)
            throw new Error("Could not create public links table. Please contact an administrator.")
          }
        } else {
          throw new Error(`Error checking for existing link: ${checkError.message}`)
        }
      }

      // Now try to insert or update the link
      if (existingLink) {
        // Update existing link
        try {
          const result = await supabase
            .from("public_links")
            .update({
              access_key: accessKey,
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingLink.id)

          if (result.error) {
            throw new Error(`Failed to update public link: ${result.error.message || "Unknown error"}`)
          }
        } catch (err) {
          console.log("Error updating link:", err)
          throw err
        }
      } else {
        // Create new link
        try {
          const result = await supabase.from("public_links").insert({
            sheet_id: params.id,
            access_key: accessKey,
            created_by: user.id,
            is_active: true,
          })

          if (result.error) {
            // If the error is about the table not existing, we need to create it first
            if (result.error.message && result.error.message.includes("does not exist")) {
              console.log("Table does not exist on insert, trying to create it")

              try {
                // Try to create the table via API
                await fetch("/api/setup-public-links-table", {
                  method: "POST",
                })

                // Try the insert again
                const retryResult = await supabase.from("public_links").insert({
                  sheet_id: params.id,
                  access_key: accessKey,
                  created_by: user.id,
                  is_active: true,
                })

                if (retryResult.error) {
                  throw new Error(
                    `Failed to create public link after creating table: ${retryResult.error.message || "Unknown error"}`,
                  )
                }
              } catch (err) {
                console.error("Failed to create table and retry:", err)
                throw new Error("Could not create public links table. Please contact an administrator.")
              }
            } else {
              throw new Error(`Failed to create public link: ${result.error.message || "Unknown error"}`)
            }
          }
        } catch (err) {
          console.log("Error inserting link:", err)
          throw err
        }
      }

      // Set the public link in state
      const newPublicLink = `${window.location.origin}/public/sheets/${accessKey}`
      setPublicLink(newPublicLink)
      setIsPublicLinkActive(true)

      console.log("Successfully created public link:", newPublicLink)
      return newPublicLink
    } catch (err: any) {
      console.error("Error creating public link:", err)
      throw new Error(err.message || "Failed to create public link")
    }
  }

  const togglePublicLinkHandler = async () => {
    if (!user) return

    try {
      // Toggle the active status
      const newStatus = !isPublicLinkActive

      try {
        const result = await supabase
          .from("public_links")
          .update({
            is_active: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("sheet_id", params.id)

        if (result.error) {
          throw new Error(`Failed to update link status: ${result.error.message || "Unknown error"}`)
        }
      } catch (err) {
        console.log("Error toggling link:", err)
        throw err
      }

      setIsPublicLinkActive(newStatus)
    } catch (err: any) {
      console.error("Error toggling public link:", err)
      throw new Error(err.message || "Failed to update link status")
    }
  }

  // Filter rows based on search term and column filters
  const filteredRows = rows.filter((row) => {
    // First apply global search
    if (globalSearchTerm.trim()) {
      const matchesGlobalSearch = Object.entries(row.cells).some(([columnId, cellValue]) => {
        const column = columns.find((col) => col.id === columnId)
        if (!column) return false

        // Convert cell value to string for searching
        let valueStr = ""
        if (cellValue === null || cellValue === undefined) {
          valueStr = ""
        } else if (typeof cellValue === "boolean") {
          valueStr = cellValue ? "true" : "false"
        } else {
          valueStr = String(cellValue)
        }

        return valueStr.toLowerCase().includes(globalSearchTerm.toLowerCase())
      })

      if (!matchesGlobalSearch) return false
    }

    // Then apply column filters
    if (columnFilters.length > 0) {
      return columnFilters.every((filter) => {
        if (!filter.value.trim()) return true

        const cellValue = row.cells[filter.columnId]
        let valueStr = ""

        if (cellValue === null || cellValue === undefined) {
          valueStr = ""
        } else if (typeof cellValue === "boolean") {
          valueStr = cellValue ? "true" : "false"
        } else {
          valueStr = String(cellValue)
        }

        return valueStr.toLowerCase().includes(filter.value.toLowerCase())
      })
    }

    return true
  })

  if (loading) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p>Loading sheet...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <div className="bg-destructive/10 p-4 rounded-md">
          <p className="text-destructive">{error}</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <main className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          {isEditingName ? (
            <div className="flex items-center">
              <Input
                ref={nameInputRef}
                value={newSheetName}
                onChange={(e) => setNewSheetName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-10 text-xl font-bold mr-2 w-[300px]"
                disabled={isRenamingSheet}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={saveSheetName}
                disabled={isRenamingSheet || newSheetName.trim() === "" || newSheetName === sheet?.name}
                className="h-8 w-8"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={cancelEditingName}
                disabled={isRenamingSheet}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center">
              <h1 className="text-3xl font-bold">{sheet?.name}</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={startEditingName}
                className="ml-2 h-8 w-8"
                title="Rename sheet"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <SheetPermissionsBadge sheetId={params.id} />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShareLinkDialog(true)}
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            {publicLink ? "Manage Public Link" : "Create Public Link"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPermissionsDialog(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Manage Access
          </Button>
          <DeleteSheetButton sheetId={params.id} sheetName={sheet?.name || "this sheet"} />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6 justify-between items-center">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setShowColumnManagementDialog(true)} className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Manage Columns
          </Button>
          <Button onClick={addNewRow} variant="outline" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Row
          </Button>
          <Button onClick={addStatusColumn} variant="outline" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Add Status Column
          </Button>

          {/* Save button */}
          <Button
            onClick={saveChanges}
            disabled={pendingChanges.length === 0 || isSaving}
            variant={pendingChanges.length > 0 ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : `Save${pendingChanges.length > 0 ? ` (${pendingChanges.length})` : ""}`}
          </Button>

          {/* Auto-save toggle */}
          <Button
            onClick={toggleAutoSave}
            variant="outline"
            className={`flex items-center gap-2 ${
              autoSave ? "bg-green-50 text-green-800" : "bg-yellow-50 text-yellow-800"
            }`}
          >
            {autoSave ? "Auto-save: On" : "Auto-save: Off"}
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={exportToExcel} variant="outline" className="flex items-center gap-2">
            <FileDown className="h-4 w-4" />
            Export to Excel
          </Button>
          <Button variant="outline" className="flex items-center gap-2" asChild>
            <label>
              <FileUp className="h-4 w-4" />
              Import Excel
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={importFromExcel} />
            </label>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search across all fields..."
            value={globalSearchTerm}
            onChange={(e) => setGlobalSearchTerm(e.target.value)}
            className="pl-10 pr-4"
          />
        </div>
        {columnFilters.length > 0 && (
          <Button variant="outline" onClick={clearAllFilters} size="sm">
            Clear All Filters ({columnFilters.length})
          </Button>
        )}
      </div>

      {pendingChanges.length > 0 && !autoSave && (
        <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm flex items-center justify-between text-yellow-800">
          <span>You have {pendingChanges.length} unsaved changes. Click the Save button to save your changes.</span>
          <Button size="sm" onClick={saveChanges} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Now"}
          </Button>
        </div>
      )}

      <div className="overflow-auto border rounded-lg">
        <ExcelSheet
          columns={columns}
          rows={filteredRows}
          onUpdateCell={updateCell}
          onDeleteRow={deleteRow}
          searchTerm={globalSearchTerm}
          columnFilters={columnFilters}
          onColumnFilterChange={handleColumnFilterChange}
          activeFilterColumn={activeFilterColumn}
          setActiveFilterColumn={setActiveFilterColumn}
          toggleStatus={toggleStatus}
        />
      </div>

      {(globalSearchTerm || columnFilters.length > 0) && filteredRows.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No results found for the current search and filters
        </div>
      )}

      {columns && (
        <ColumnManagementDialog
          open={showColumnManagementDialog}
          onOpenChange={setShowColumnManagementDialog}
          columns={columns}
          onUpdateColumns={updateColumns}
        />
      )}

      <ShareLinkDialog
        open={showShareLinkDialog}
        onOpenChange={setShowShareLinkDialog}
        publicLink={publicLink}
        isActive={isPublicLinkActive}
        onCreateLink={createPublicLinkHandler}
        onToggleLink={togglePublicLinkHandler}
        sheetName={sheet?.name || ""}
      />

      <SheetPermissionsDialog
        open={showPermissionsDialog}
        onOpenChange={setShowPermissionsDialog}
        sheetId={params.id}
        sheetName={sheet?.name || ""}
      />
    </main>
  )
}
