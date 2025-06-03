"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  AlertCircle,
  Check,
  Trash2,
  FileUp,
  Save,
  CheckSquare,
  Square,
  MessageSquare,
  X,
  Download,
  Database,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type SettlementItem = {
  id: string
  mr_number: string
  status: "none" | "problem" | "done"
  notes?: string | null
  created_at: string
}

// Local storage key
const STORAGE_KEY = "settlementTrackerItems"

export function SimplifiedSettlementTracker() {
  const [items, setItems] = useState<SettlementItem[]>([])
  const [newMrNumber, setNewMrNumber] = useState("")
  const [importText, setImportText] = useState("")
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesText, setNotesText] = useState("")
  const [notesPopoverOpen, setNotesPopoverOpen] = useState(false)
  const [importDialogJson, setImportDialogJson] = useState(false)
  const [jsonImportText, setJsonImportText] = useState("")
  const { toast } = useToast()

  // Load data from localStorage on component mount
  useEffect(() => {
    try {
      const savedItems = localStorage.getItem(STORAGE_KEY)
      if (savedItems) {
        const parsedItems = JSON.parse(savedItems)
        if (Array.isArray(parsedItems)) {
          setItems(parsedItems)
          toast({
            title: "Data loaded from local storage",
            description: `${parsedItems.length} items loaded from your browser's storage.`,
          })
        }
      }
    } catch (error) {
      console.error("Failed to load data from localStorage:", error)
      toast({
        title: "Error loading saved data",
        description: "There was a problem loading your saved data.",
        variant: "destructive",
      })
    }
  }, [])

  // Save data to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.error("Failed to save data to localStorage:", error)
      toast({
        title: "Error saving data",
        description: "There was a problem saving your data to local storage.",
        variant: "destructive",
      })
    }
  }, [items])

  const handleAddItem = () => {
    if (!newMrNumber.trim()) return

    // Check if MR number already exists
    const exists = items.some((item) => item.mr_number === newMrNumber.trim())
    if (exists) {
      toast({
        title: "Duplicate MR Number",
        description: `${newMrNumber} already exists in your list.`,
        variant: "destructive",
      })
      return
    }

    // Add new item
    const newItem: SettlementItem = {
      id: crypto.randomUUID(),
      mr_number: newMrNumber.trim(),
      status: "none",
      notes: null,
      created_at: new Date().toISOString(),
    }

    setItems([newItem, ...items])
    setNewMrNumber("")
    toast({
      title: "MR Number added",
      description: `${newMrNumber} has been added successfully.`,
    })
  }

  const handleToggleStatus = (id: string, newStatus: "none" | "problem" | "done") => {
    setItems(items.map((item) => (item.id === id ? { ...item, status: newStatus } : item)))
  }

  const handleDeleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))

    // Remove from selected items if it was selected
    if (selectedItems.has(id)) {
      const newSelected = new Set(selectedItems)
      newSelected.delete(id)
      setSelectedItems(newSelected)
    }

    toast({
      title: "MR Number deleted",
      description: "The MR Number has been deleted successfully.",
    })
  }

  const handleImport = () => {
    if (!importText.trim()) return

    // Split by newline, comma, or semicolon
    const mrNumbers = importText
      .split(/[\n,;]+/)
      .map((num) => num.trim())
      .filter((num) => num !== "")

    if (mrNumbers.length === 0) return

    // Check for duplicates
    const existingMrNumbers = new Set(items.map((item) => item.mr_number))
    const newMrNumbers = mrNumbers.filter((mrNumber) => !existingMrNumbers.has(mrNumber))
    const duplicatesCount = mrNumbers.length - newMrNumbers.length

    // Add new items
    const newItems = newMrNumbers.map((mrNumber) => ({
      id: crypto.randomUUID(),
      mr_number: mrNumber,
      status: "none" as const,
      notes: null,
      created_at: new Date().toISOString(),
    }))

    if (newItems.length > 0) {
      setItems([...newItems, ...items])
    }

    setImportText("")
    setImportDialogOpen(false)

    // Show appropriate message based on results
    if (duplicatesCount > 0) {
      if (newItems.length > 0) {
        toast({
          title: "MR Numbers imported",
          description: `${newItems.length} unique MR Numbers imported. ${duplicatesCount} duplicates were skipped.`,
        })
      } else {
        toast({
          title: "No new MR Numbers imported",
          description: `All ${duplicatesCount} MR Numbers were duplicates and were skipped.`,
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "MR Numbers imported",
        description: `${newItems.length} MR Numbers have been imported successfully.`,
      })
    }
  }

  const handleImportJson = () => {
    if (!jsonImportText.trim()) return

    try {
      const importedData = JSON.parse(jsonImportText)

      if (!Array.isArray(importedData)) {
        throw new Error("Imported data is not an array")
      }

      // Validate and transform the imported data
      const validItems = importedData
        .filter((item) => typeof item === "object" && item !== null && typeof item.mr_number === "string")
        .map((item) => ({
          id: item.id || crypto.randomUUID(),
          mr_number: item.mr_number,
          status: ["none", "problem", "done"].includes(item.status) ? item.status : "none",
          notes: item.notes || null,
          created_at: item.created_at || new Date().toISOString(),
        }))

      if (validItems.length === 0) {
        throw new Error("No valid items found in imported data")
      }

      // Check for duplicates
      const existingMrNumbers = new Set(items.map((item) => item.mr_number))
      const newItems = validItems.filter((item) => !existingMrNumbers.has(item.mr_number))
      const duplicatesCount = validItems.length - newItems.length

      if (newItems.length > 0) {
        setItems([...newItems, ...items])
      }

      setJsonImportText("")
      setImportDialogJson(false)

      // Show appropriate message
      if (duplicatesCount > 0) {
        if (newItems.length > 0) {
          toast({
            title: "Items imported from JSON",
            description: `${newItems.length} unique items imported. ${duplicatesCount} duplicates were skipped.`,
          })
        } else {
          toast({
            title: "No new items imported",
            description: `All ${duplicatesCount} items were duplicates and were skipped.`,
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Items imported from JSON",
          description: `${newItems.length} items have been imported successfully.`,
        })
      }
    } catch (error) {
      console.error("JSON import error:", error)
      toast({
        title: "Import failed",
        description: "Failed to import JSON data. Please check the format and try again.",
        variant: "destructive",
      })
    }
  }

  const handleSaveAll = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
      toast({
        title: "Data saved to local storage",
        description: `${items.length} items saved to your browser's storage.`,
      })
    } catch (error) {
      console.error("Failed to save to localStorage:", error)
      toast({
        title: "Error saving data",
        description: "There was a problem saving your data to local storage.",
        variant: "destructive",
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddItem()
    }
  }

  // Export functions
  const exportToCsv = () => {
    try {
      // Create CSV content
      let csv = "MR Number,Status,Notes,Created At\n"

      items.forEach((item) => {
        // Escape notes to handle commas and quotes
        const notes = item.notes ? `"${item.notes.replace(/"/g, '""')}"` : ""

        csv += `${item.mr_number},${item.status},${notes},${item.created_at}\n`
      })

      // Create and download the file
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `settlement-tracker-${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Export successful",
        description: `${items.length} items exported to CSV.`,
      })
    } catch (error) {
      console.error("CSV export error:", error)
      toast({
        title: "Export failed",
        description: "Failed to export data to CSV.",
        variant: "destructive",
      })
    }
  }

  const exportToJson = () => {
    try {
      const json = JSON.stringify(items, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `settlement-tracker-${new Date().toISOString().split("T")[0]}.json`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Export successful",
        description: `${items.length} items exported to JSON.`,
      })
    } catch (error) {
      console.error("JSON export error:", error)
      toast({
        title: "Export failed",
        description: "Failed to export data to JSON.",
        variant: "destructive",
      })
    }
  }

  const clearAllData = () => {
    if (window.confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      setItems([])
      setSelectedItems(new Set())
      localStorage.removeItem(STORAGE_KEY)
      toast({
        title: "Data cleared",
        description: "All data has been cleared from local storage.",
      })
    }
  }

  // Selection handling
  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) {
      // If all are selected, unselect all
      setSelectedItems(new Set())
    } else {
      // Otherwise, select all
      const allIds = new Set(items.map((item) => item.id))
      setSelectedItems(allIds)
    }
  }

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  // Bulk actions
  const handleBulkAction = (action: "problem" | "done" | "none" | "delete") => {
    if (selectedItems.size === 0) return

    if (action === "delete") {
      setItems(items.filter((item) => !selectedItems.has(item.id)))
      setSelectedItems(new Set())
      toast({
        title: "Items deleted",
        description: `${selectedItems.size} items have been deleted successfully.`,
      })
    } else {
      setItems(items.map((item) => (selectedItems.has(item.id) ? { ...item, status: action } : item)))
      toast({
        title: "Items updated",
        description: `${selectedItems.size} items have been updated successfully.`,
      })
    }
  }

  // Notes handling
  const startEditingNotes = (id: string, currentNotes = "") => {
    setEditingNotes(id)
    setNotesText(currentNotes || "")
    setNotesPopoverOpen(true)
  }

  const saveNotes = (id: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, notes: notesText } : item)))
    setEditingNotes(null)
    setNotesPopoverOpen(false)
    toast({
      title: "Notes saved",
      description: "Notes have been saved successfully.",
    })
  }

  const cancelEditingNotes = () => {
    setEditingNotes(null)
    setNotesPopoverOpen(false)
    setNotesText("")
  }

  const problemCount = items.filter((item) => item.status === "problem").length
  const doneCount = items.filter((item) => item.status === "done").length
  const selectedCount = selectedItems.size

  return (
    <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold">Settlement Tracker (Local Mode)</CardTitle>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-1">
                <Download className="h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToCsv}>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={exportToJson}>Export as JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={handleSaveAll} className="bg-green-600 hover:bg-green-700">
            <Save className="mr-2 h-4 w-4" /> Save Locally
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Enter MR Number"
            value={newMrNumber}
            onChange={(e) => setNewMrNumber(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button onClick={handleAddItem}>Add</Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-1">
                <FileUp className="h-4 w-4" /> Import
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>Import MR Numbers</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImportDialogJson(true)}>Import from JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import MR Numbers</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Paste MR numbers below, one per line or separated by commas.
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  <strong>Note:</strong> Duplicate MR numbers will be automatically skipped.
                </p>
                <Textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="MR-001&#10;MR-002&#10;MR-003"
                  className="min-h-[150px]"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImport}>Import Numbers</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={importDialogJson} onOpenChange={setImportDialogJson}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import from JSON</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Paste JSON data below. The format should match the export format.
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  <strong>Note:</strong> Duplicate MR numbers will be automatically skipped.
                </p>
                <Textarea
                  value={jsonImportText}
                  onChange={(e) => setJsonImportText(e.target.value)}
                  placeholder='[{"id":"123","mr_number":"MR-001","status":"none","notes":"Example note"}]'
                  className="min-h-[150px] font-mono text-sm"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportDialogJson(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImportJson}>Import JSON</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Data management info */}
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <Database className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300">Data Storage Information</h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Your data is being saved to your browser's local storage. It will persist between page refreshes but is
                limited to this browser. Use the Export button to save your data externally.
              </p>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedItems.size > 0 && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-muted/30 rounded-md">
            <span className="text-sm font-medium ml-2">
              {selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex-1"></div>
            <Button
              size="sm"
              variant="outline"
              className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
              onClick={() => handleBulkAction("problem")}
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              Mark as Problem
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-green-500 border-green-200 hover:bg-green-50 hover:text-green-600"
              onClick={() => handleBulkAction("done")}
            >
              <Check className="h-4 w-4 mr-1" />
              Mark as Done
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction("none")}>
              Clear Status
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete ${selectedItems.size} items?`)) {
                  handleBulkAction("delete")
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        )}

        <div className="border rounded-md overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[40px,40px,1fr,80px,80px,60px] bg-muted p-3 font-medium text-sm">
            <div className="flex items-center justify-center">
              <button
                onClick={toggleSelectAll}
                className="h-5 w-5 flex items-center justify-center text-gray-500 hover:text-gray-700"
                aria-label={selectedItems.size === items.length ? "Deselect all" : "Select all"}
              >
                {selectedItems.size === items.length && items.length > 0 ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="text-center">#</div>
            <div>MR Number</div>
            <div className="text-center">Problem</div>
            <div className="text-center">Done</div>
            <div className="text-center">Notes</div>
          </div>

          {/* Items */}
          {items.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No MR numbers added yet. Add your first one above.
            </div>
          ) : (
            <div className="divide-y">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={`grid grid-cols-[40px,40px,1fr,80px,80px,60px] items-center p-3 ${
                    item.status === "done"
                      ? "bg-green-50 dark:bg-green-950/20"
                      : item.status === "problem"
                        ? "bg-red-50 dark:bg-red-950/20"
                        : index % 2 === 0
                          ? "bg-white dark:bg-background"
                          : "bg-gray-50 dark:bg-muted/30"
                  }`}
                >
                  {/* Selection Checkbox */}
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => toggleSelectItem(item.id)}
                      className="h-5 w-5 flex items-center justify-center text-gray-500 hover:text-gray-700"
                      aria-label={selectedItems.has(item.id) ? "Deselect" : "Select"}
                    >
                      {selectedItems.has(item.id) ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Line Number */}
                  <div className="text-center text-sm text-muted-foreground">{index + 1}</div>

                  <div className="font-medium">{item.mr_number}</div>

                  {/* Problem Checkbox */}
                  <div className="flex justify-center items-center">
                    <button
                      onClick={() => handleToggleStatus(item.id, item.status === "problem" ? "none" : "problem")}
                      className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                        item.status === "problem"
                          ? "bg-red-500 text-white"
                          : "border border-gray-300 hover:border-gray-400"
                      }`}
                      aria-label={item.status === "problem" ? "Remove problem status" : "Mark as problem"}
                    >
                      {item.status === "problem" && <AlertCircle className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Done Checkbox */}
                  <div className="flex justify-center items-center">
                    <button
                      onClick={() => handleToggleStatus(item.id, item.status === "done" ? "none" : "done")}
                      className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                        item.status === "done"
                          ? "bg-green-500 text-white"
                          : "border border-gray-300 hover:border-gray-400"
                      }`}
                      aria-label={item.status === "done" ? "Remove done status" : "Mark as done"}
                    >
                      {item.status === "done" && <Check className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Notes */}
                  <div className="flex justify-between items-center">
                    <Popover
                      open={editingNotes === item.id && notesPopoverOpen}
                      onOpenChange={(open) => {
                        if (!open) {
                          cancelEditingNotes()
                        }
                        setNotesPopoverOpen(open)
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditingNotes(item.id, item.notes || "")}
                          className={`h-8 w-8 p-0 ${item.notes ? "text-blue-500" : "text-gray-400"}`}
                          aria-label={item.notes ? "Edit notes" : "Add notes"}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="end" side="top">
                        <div className="p-3">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-medium">Notes for {item.mr_number}</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditingNotes}
                              className="h-6 w-6 p-0"
                              aria-label="Cancel editing notes"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <Textarea
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            placeholder="Add notes about this MR number..."
                            className="min-h-[100px] mb-2"
                          />
                          <div className="flex justify-end">
                            <Button size="sm" onClick={() => saveNotes(item.id)}>
                              Save Notes
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    {/* Show tooltip for notes content */}
                    {item.notes && !notesPopoverOpen && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex-1"></div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="max-w-xs">
                              <p className="font-medium mb-1">Notes:</p>
                              <p className="text-sm">{item.notes}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-gray-500 hover:text-red-500 transition-colors"
                      aria-label="Delete item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="bg-muted/30 px-6 py-4 flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {items.length > 0 ? (
            <>
              Total: <span className="font-medium">{items.length}</span> • With Problems:{" "}
              <span className="font-medium text-red-500">{problemCount}</span> • Completed:{" "}
              <span className="font-medium text-green-500">{doneCount}</span> • Pending:{" "}
              <span className="font-medium">{items.length - problemCount - doneCount}</span>
              {selectedCount > 0 && (
                <>
                  {" "}
                  • Selected: <span className="font-medium text-blue-500">{selectedCount}</span>
                </>
              )}
            </>
          ) : (
            "Add MR numbers to track them here"
          )}
        </div>

        {items.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={clearAllData}
          >
            Clear All Data
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
