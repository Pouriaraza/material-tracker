"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Trash2, Plus } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Column {
  id: string
  name: string
  type: "text" | "number" | "date" | "checkbox"
}

interface ColumnManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: Column[]
  onUpdateColumns: (columns: Column[]) => void
}

export function ColumnManagementDialog({ open, onOpenChange, columns, onUpdateColumns }: ColumnManagementDialogProps) {
  const [editingColumn, setEditingColumn] = useState<Column | null>(null)
  const [columnName, setColumnName] = useState("")
  const [columnType, setColumnType] = useState<"text" | "number" | "date" | "checkbox">("text")
  const [isAdding, setIsAdding] = useState(false)
  const [workingColumns, setWorkingColumns] = useState<Column[]>([])

  // Initialize working columns when dialog opens
  useEffect(() => {
    if (open) {
      setWorkingColumns([...columns])
      setIsAdding(false)
      setEditingColumn(null)
    }
  }, [open, columns])

  const handleAddColumn = () => {
    setIsAdding(true)
    setEditingColumn(null)
    setColumnName("")
    setColumnType("text")
  }

  const handleEditColumn = (column: Column) => {
    setIsAdding(false)
    setEditingColumn(column)
    setColumnName(column.name)
    setColumnType(column.type)
  }

  const handleDeleteColumn = (columnId: string) => {
    const updatedColumns = workingColumns.filter((col) => col.id !== columnId)
    setWorkingColumns(updatedColumns)
  }

  const handleSaveColumn = () => {
    if (!columnName.trim()) return

    if (isAdding) {
      // Add new column - استفاده از crypto.randomUUID() برای ID منحصر به فرد
      const newColumn: Column = {
        id: crypto.randomUUID(),
        name: columnName,
        type: columnType,
      }
      setWorkingColumns([...workingColumns, newColumn])
    } else if (editingColumn) {
      // Update existing column
      const updatedColumns = workingColumns.map((col) =>
        col.id === editingColumn.id ? { ...col, name: columnName, type: columnType } : col,
      )
      setWorkingColumns(updatedColumns)
    }

    // Reset form
    setIsAdding(false)
    setEditingColumn(null)
    setColumnName("")
    setColumnType("text")
  }

  const handleSaveChanges = () => {
    onUpdateColumns(workingColumns)
    onOpenChange(false)
  }

  const handleCancelEdit = () => {
    setIsAdding(false)
    setEditingColumn(null)
    setColumnName("")
    setColumnType("text")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Manage Columns</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1" style={{ maxHeight: "calc(80vh - 180px)" }}>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Current Columns</h3>
            <Button onClick={handleAddColumn} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Column
            </Button>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Column Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workingColumns.map((column) => (
                  <TableRow key={column.id}>
                    <TableCell>{column.name}</TableCell>
                    <TableCell className="capitalize">{column.type}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditColumn(column)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteColumn(column.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {workingColumns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                      No columns defined. Add a column to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {(isAdding || editingColumn) && (
            <div className="border rounded-md p-4 space-y-4">
              <h3 className="text-lg font-medium">{isAdding ? "Add New Column" : "Edit Column"}</h3>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="column-name">Column Name</Label>
                  <Input
                    id="column-name"
                    value={columnName}
                    onChange={(e) => setColumnName(e.target.value)}
                    placeholder="Enter column name"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Data Type</Label>
                  <Select value={columnType} onValueChange={(value) => setColumnType(value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="checkbox">Checkbox</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveColumn} disabled={!columnName.trim()}>
                    {isAdding ? "Add Column" : "Update Column"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveChanges}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
