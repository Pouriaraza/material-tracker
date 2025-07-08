"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Trash2, CheckCircle, XCircle, Clock, Plus, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ColumnFilterPopover } from "@/components/column-filter-popover"
import { Badge } from "@/components/ui/badge"
import { AddColumnDialog } from "@/components/add-column-dialog"
import { ColumnManagementDialog } from "@/components/column-management-dialog"
import { toast } from "sonner"

interface Column {
  id: string
  name: string
  type: "text" | "number" | "date" | "checkbox"
  width?: number
  position: number
}

interface Row {
  id: string
  cells: Record<string, any>
  position: number
}

interface ColumnFilter {
  columnId: string
  value: string
}

interface ExcelSheetProps {
  sheetId: string
  initialColumns: Column[]
  initialRows: Row[]
  canEdit?: boolean
  canManageColumns?: boolean
}

export function ExcelSheet({
  sheetId,
  initialColumns = [],
  initialRows = [],
  canEdit = true,
  canManageColumns = true,
}: ExcelSheetProps) {
  const [columns, setColumns] = useState<Column[]>(initialColumns)
  const [rows, setRows] = useState<Row[]>(initialRows)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [columnFilters, setColumnFilters] = useState<ColumnFilter[]>([])
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const resizeStartX = useRef<number>(0)
  const resizeStartWidth = useRef<number>(0)
  const [resizeGuidePosition, setResizeGuidePosition] = useState<number | null>(null)

  // Load saved column widths from localStorage
  useEffect(() => {
    try {
      const storedWidths = localStorage.getItem(`columnWidths_${sheetId}`)
      if (storedWidths) {
        setColumnWidths(JSON.parse(storedWidths))
      }
    } catch (error) {
      console.error("Failed to load column widths from localStorage:", error)
    }
  }, [sheetId])

  // Update cell value
  const handleCellChange = useCallback(
    async (rowId: string, columnId: string, value: any, type: string) => {
      let processedValue = value

      // Process value based on column type
      if (type === "number") {
        processedValue = value === "" ? 0 : Number(value)
      } else if (type === "checkbox") {
        processedValue = value
      }

      // Update local state immediately
      setRows((prevRows) =>
        prevRows.map((row) =>
          row.id === rowId ? { ...row, cells: { ...row.cells, [columnId]: processedValue } } : row,
        ),
      )

      // Update database
      try {
        const response = await fetch(`/api/sheets-new/${sheetId}/rows`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rowId,
            columnId,
            value: processedValue,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to update cell")
        }
      } catch (error) {
        console.error("Error updating cell:", error)
        toast.error("Failed to update cell")
      }
    },
    [sheetId],
  )

  // Add new row
  const handleAddRow = useCallback(async () => {
    if (!canEdit) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/sheets-new/${sheetId}/rows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        throw new Error("Failed to add row")
      }

      const newRow = await response.json()
      setRows((prevRows) => [...prevRows, newRow])
      toast.success("Row added successfully")
    } catch (error) {
      console.error("Error adding row:", error)
      toast.error("Failed to add row")
    } finally {
      setIsLoading(false)
    }
  }, [sheetId, canEdit])

  // Delete row
  const handleDeleteRow = useCallback(
    async (rowId: string) => {
      if (!canEdit) return

      try {
        const response = await fetch(`/api/sheets-new/${sheetId}/rows`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rowId }),
        })

        if (!response.ok) {
          throw new Error("Failed to delete row")
        }

        setRows((prevRows) => prevRows.filter((row) => row.id !== rowId))
        toast.success("Row deleted successfully")
      } catch (error) {
        console.error("Error deleting row:", error)
        toast.error("Failed to delete row")
      }
    },
    [sheetId, canEdit],
  )

  // Filter rows based on search and column filters
  const filteredRows = rows.filter((row) => {
    // Search filter
    if (searchTerm) {
      const searchMatch = Object.values(row.cells).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase()),
      )
      if (!searchMatch) return false
    }

    // Column filters
    for (const filter of columnFilters) {
      if (filter.value) {
        const cellValue = String(row.cells[filter.columnId] || "")
        if (!cellValue.toLowerCase().includes(filter.value.toLowerCase())) {
          return false
        }
      }
    }

    return true
  })

  // Calculate sum for number columns
  const calculateColumnSum = (columnId: string) => {
    const column = columns.find((col) => col.id === columnId)
    if (column?.type !== "number") return null

    return filteredRows.reduce((sum, row) => {
      const value = row.cells[columnId]
      return sum + (typeof value === "number" ? value : 0)
    }, 0)
  }

  // Calculate average for number columns
  const calculateColumnAverage = (columnId: string) => {
    const column = columns.find((col) => col.id === columnId)
    if (column?.type !== "number" || filteredRows.length === 0) return null

    const sum = calculateColumnSum(columnId)
    return sum !== null ? sum / filteredRows.length : null
  }

  // Highlight search term in text
  const highlightSearchTerm = (text: string, term: string) => {
    if (!term || !text) return text

    const parts = text.toString().split(new RegExp(`(${term})`, "gi"))

    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === term.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">
              {part}
            </mark>
          ) : (
            part
          ),
        )}
      </>
    )
  }

  // Get filter for a specific column
  const getColumnFilter = (columnId: string) => {
    return columnFilters.find((filter) => filter.columnId === columnId)?.value || ""
  }

  // Update column filter
  const handleColumnFilterChange = (columnId: string, value: string) => {
    setColumnFilters((prev) => {
      const existing = prev.find((f) => f.columnId === columnId)
      if (existing) {
        if (value) {
          return prev.map((f) => (f.columnId === columnId ? { ...f, value } : f))
        } else {
          return prev.filter((f) => f.columnId !== columnId)
        }
      } else if (value) {
        return [...prev, { columnId, value }]
      }
      return prev
    })
  }

  // Column resize handlers
  const handleResizeStart = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault()
    setResizingColumn(columnId)
    resizeStartX.current = e.clientX
    resizeStartWidth.current = columnWidths[columnId] || 120
    setResizeGuidePosition(e.clientX)

    document.addEventListener("mousemove", handleResizeMove)
    document.addEventListener("mouseup", handleResizeEnd)
  }

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingColumn) return

    e.preventDefault()
    const diff = e.clientX - resizeStartX.current
    const newWidth = Math.max(80, resizeStartWidth.current + diff)

    setColumnWidths((prev) => ({
      ...prev,
      [resizingColumn]: newWidth,
    }))

    setResizeGuidePosition(e.clientX)
  }

  const handleResizeEnd = () => {
    setResizingColumn(null)
    setResizeGuidePosition(null)
    document.removeEventListener("mousemove", handleResizeMove)
    document.removeEventListener("mouseup", handleResizeEnd)

    if (resizingColumn) {
      try {
        const storedWidths = JSON.parse(localStorage.getItem(`columnWidths_${sheetId}`) || "{}")
        const updatedWidths = {
          ...storedWidths,
          [resizingColumn]: columnWidths[resizingColumn],
        }
        localStorage.setItem(`columnWidths_${sheetId}`, JSON.stringify(updatedWidths))
      } catch (error) {
        console.error("Failed to save column width to localStorage:", error)
      }
    }
  }

  // Toggle status for status columns
  const toggleStatus = (rowId: string, columnId: string, currentValue: string) => {
    const statusCycle = ["Pending", "Done", "Problem"]
    const currentIndex = statusCycle.indexOf(currentValue)
    const nextIndex = (currentIndex + 1) % statusCycle.length
    const nextStatus = statusCycle[nextIndex]

    handleCellChange(rowId, columnId, nextStatus, "text")
  }

  // Render status badge with appropriate color and icon
  const renderStatusBadge = (status: string, rowId: string, columnId: string) => {
    if (!status) return null

    let badgeClass = ""
    let icon = null

    switch (status.toLowerCase()) {
      case "done":
        badgeClass = "bg-green-100 text-green-800 hover:bg-green-200"
        icon = <CheckCircle className="h-3 w-3 mr-1" />
        break
      case "problem":
        badgeClass = "bg-red-100 text-red-800 hover:bg-red-200"
        icon = <XCircle className="h-3 w-3 mr-1" />
        break
      case "pending":
      default:
        badgeClass = "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
        icon = <Clock className="h-3 w-3 mr-1" />
        break
    }

    return (
      <Badge
        className={`flex items-center cursor-pointer ${badgeClass}`}
        onClick={() => canEdit && toggleStatus(rowId, columnId, status)}
      >
        {icon}
        {status}
      </Badge>
    )
  }

  // Check if a column is a status column
  const isStatusColumn = (column: Column) => {
    return (
      column.type === "text" && (column.name.toLowerCase() === "status" || column.name.toLowerCase().includes("status"))
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search all columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          {columnFilters.length > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              {columnFilters.length} filter{columnFilters.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Button onClick={handleAddRow} disabled={isLoading} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Row
            </Button>
          )}
          {canManageColumns && (
            <>
              <AddColumnDialog sheetId={sheetId} onColumnAdded={(column) => setColumns((prev) => [...prev, column])} />
              <ColumnManagementDialog sheetId={sheetId} columns={columns} onColumnsUpdated={setColumns} />
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto relative border rounded-lg">
        {resizeGuidePosition !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
            style={{
              left: `${resizeGuidePosition}px`,
              height: "100%",
              transform: "translateX(-50%)",
            }}
          />
        )}
        <table className="w-full border-collapse">
          <thead>
            <tr className={`bg-muted ${resizingColumn ? "select-none" : ""}`}>
              <th className="border p-2 text-left w-10 text-sm">#</th>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className="border p-2 text-left text-sm relative"
                  style={{
                    width: columnWidths[column.id] ? `${columnWidths[column.id]}px` : "120px",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis">{column.name}</span>
                    <ColumnFilterPopover
                      column={column}
                      value={getColumnFilter(column.id)}
                      onChange={(value) => handleColumnFilterChange(column.id, value)}
                      isActive={columnFilters.some((filter) => filter.columnId === column.id)}
                      onOpenChange={(open) => {
                        if (open) {
                          setActiveFilterColumn(column.id)
                        } else if (activeFilterColumn === column.id) {
                          setActiveFilterColumn(null)
                        }
                      }}
                    />
                  </div>
                  <div
                    className="absolute top-0 right-0 h-full w-4 cursor-col-resize hover:bg-gray-400 active:bg-gray-600"
                    onMouseDown={(e) => handleResizeStart(e, column.id)}
                    title="Drag to resize column"
                  />
                </th>
              ))}
              <th className="border p-2 text-center w-16 text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => (
              <tr
                key={row.id}
                className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                onMouseEnter={() => setHoveredRow(row.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <td className="border p-2 text-center text-muted-foreground">{index + 1}</td>
                {columns.map((column) => {
                  const columnFilter = getColumnFilter(column.id)
                  const cellValue = row.cells[column.id]
                  const isStatus = isStatusColumn(column)

                  return (
                    <td
                      key={`${row.id}-${column.id}`}
                      className="border p-2 text-black"
                      style={{
                        width: columnWidths[column.id] ? `${columnWidths[column.id]}px` : "120px",
                      }}
                    >
                      {column.type === "checkbox" ? (
                        <div className="flex justify-center">
                          <Checkbox
                            checked={cellValue || false}
                            onCheckedChange={(checked) =>
                              canEdit && handleCellChange(row.id, column.id, checked, column.type)
                            }
                            disabled={!canEdit}
                          />
                        </div>
                      ) : isStatus && typeof cellValue === "string" ? (
                        <div className="flex justify-center">
                          {renderStatusBadge(cellValue || "Pending", row.id, column.id)}
                        </div>
                      ) : (searchTerm || columnFilter) && column.type !== "date" ? (
                        <div className="border-none p-0">
                          {highlightSearchTerm(highlightSearchTerm(cellValue || "", searchTerm), columnFilter)}
                        </div>
                      ) : (
                        <Input
                          type={column.type === "number" ? "number" : column.type}
                          defaultValue={cellValue || ""}
                          onBlur={(e) => canEdit && handleCellChange(row.id, column.id, e.target.value, column.type)}
                          className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent outline-none"
                          dir="auto"
                          autoComplete="off"
                          readOnly={!canEdit}
                          style={{ textAlign: column.type === "number" ? "right" : "inherit" }}
                        />
                      )}
                    </td>
                  )
                })}
                <td className="border p-2 text-center">
                  {canEdit && hoveredRow === row.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRow(row.id)}
                      className="h-6 w-6 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted font-medium">
              <td className="border p-2 text-sm">Sum</td>
              {columns.map((column) => (
                <td
                  key={`sum-${column.id}`}
                  className="border p-2 text-sm"
                  style={{ width: columnWidths[column.id] ? `${columnWidths[column.id]}px` : undefined }}
                >
                  {column.type === "number" && calculateColumnSum(column.id) !== null
                    ? calculateColumnSum(column.id)?.toLocaleString()
                    : ""}
                </td>
              ))}
              <td className="border p-2"></td>
            </tr>
            <tr className="bg-muted/70 font-medium">
              <td className="border p-2 text-sm">Average</td>
              {columns.map((column) => (
                <td
                  key={`avg-${column.id}`}
                  className="border p-2 text-sm"
                  style={{ width: columnWidths[column.id] ? `${columnWidths[column.id]}px` : undefined }}
                >
                  {column.type === "number" && calculateColumnAverage(column.id) !== null
                    ? calculateColumnAverage(column.id)?.toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : ""}
                </td>
              ))}
              <td className="border p-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Results info */}
      {(searchTerm || columnFilters.length > 0) && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredRows.length} of {rows.length} rows
        </div>
      )}
    </div>
  )
}
