"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import {
  AlertCircle,
  Check,
  Trash2,
  FileUp,
  Loader2,
  Save,
  CheckSquare,
  Square,
  MessageSquare,
  X,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface SettlementItem {
  id: string
  mr_number: string
  status: "none" | "problem" | "done"
  notes?: string | null
  created_at: string
  updated_at: string
}

interface SettlementTrackerClientProps {
  initialItems: SettlementItem[]
}

export function SettlementTrackerClient({ initialItems }: SettlementTrackerClientProps) {
  const [items, setItems] = useState<SettlementItem[]>(initialItems)
  const [newMrNumber, setNewMrNumber] = useState("")
  const [importText, setImportText] = useState("")
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesText, setNotesText] = useState("")
  const [notesPopoverOpen, setNotesPopoverOpen] = useState(false)
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null)
  const notesButtonRef = useRef<HTMLButtonElement>(null)
  const { toast } = useToast()

  const handleAddItem = async () => {
    if (!newMrNumber.trim()) return

    try {
      setIsLoading(true)

      // Check if MR number already exists in the current items
      const exists = items.some((item) => item.mr_number === newMrNumber.trim())
      if (exists) {
        toast({
          title: "Duplicate MR Number",
          description: `${newMrNumber} already exists in your list.`,
          variant: "destructive",
        })
        return
      }

      const response = await fetch("/api/settlement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mrNumber: newMrNumber.trim() }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to add MR number")
      }

      setItems([result.data, ...items])
      setNewMrNumber("")
      toast({
        title: "MR Number added",
        description: `${newMrNumber} has been added successfully.`,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "There was an error adding the MR Number."

      if (errorMessage.includes("already exists")) {
        toast({
          title: "Duplicate MR Number",
          description: `${newMrNumber} already exists in your list.`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Failed to add MR Number",
          description: errorMessage,
          variant: "destructive",
        })
      }
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleStatus = async (id: string, newStatus: "none" | "problem" | "done") => {
    try {
      setActionInProgress(id)

      const response = await fetch(`/api/settlement/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update status")
      }

      setItems(items.map((item) => (item.id === id ? result.data : item)))
    } catch (error) {
      toast({
        title: "Failed to update status",
        description: error instanceof Error ? error.message : "There was an error updating the status.",
        variant: "destructive",
      })
      console.error(error)
    } finally {
      setActionInProgress(null)
    }
  }

  const handleDeleteItem = async (id: string) => {
    try {
      setActionInProgress(id)

      const response = await fetch(`/api/settlement/${id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete item")
      }

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
    } catch (error) {
      toast({
        title: "Failed to delete MR Number",
        description: error instanceof Error ? error.message : "There was an error deleting the MR Number.",
        variant: "destructive",
      })
      console.error(error)
    } finally {
      setActionInProgress(null)
    }
  }

  const handleImport = async () => {
    if (!importText.trim()) return

    try {
      setIsLoading(true)
      // Split by newline, comma, or semicolon
      const mrNumbers = importText
        .split(/[\n,;]+/)
        .map((num) => num.trim())
        .filter((num) => num !== "")

      if (mrNumbers.length === 0) return

      const response = await fetch("/api/settlement/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "import",
          mrNumbers,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to import MR numbers")
      }

      if (result.data && result.data.length > 0) {
        setItems([...result.data, ...items])
      }

      setImportText("")
      setImportDialogOpen(false)

      // Show appropriate message based on results
      if (result.duplicatesCount > 0) {
        if (result.data && result.data.length > 0) {
          toast({
            title: "MR Numbers imported",
            description: `${result.data.length} unique MR Numbers imported. ${result.duplicatesCount} duplicates were skipped.`,
          })
        } else {
          toast({
            title: "No new MR Numbers imported",
            description: `All ${result.duplicatesCount} MR Numbers were duplicates and were skipped.`,
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "MR Numbers imported",
          description: `${result.data.length} MR Numbers have been imported successfully.`,
        })
      }
    } catch (error) {
      toast({
        title: "Failed to import MR Numbers",
        description: error instanceof Error ? error.message : "There was an error importing the MR Numbers.",
        variant: "destructive",
      })
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveAll = async () => {
    try {
      setIsSaving(true)
      // In a real application, you might want to perform some batch operation here
      // For now, we'll just return a success response with the current timestamp
      setLastSaved(new Date().toISOString())
      toast({
        title: "All changes saved",
        description: "All your MR Numbers have been saved successfully.",
      })
    } catch (error) {
      toast({
        title: "Failed to save changes",
        description: error instanceof Error ? error.message : "There was an error saving your changes.",
        variant: "destructive",
      })
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddItem()
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
  const handleBulkAction = async (action: "problem" | "done" | "none" | "delete") => {
    if (selectedItems.size === 0) return

    try {
      setBulkActionLoading(true)
      const selectedIds = Array.from(selectedItems)

      if (action === "delete") {
        const response = await fetch("/api/settlement/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "delete",
            ids: selectedIds,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || "Failed to delete items")
        }

        setItems(items.filter((item) => !selectedItems.has(item.id)))
        setSelectedItems(new Set())
        toast({
          title: "Items deleted",
          description: `${selectedIds.length} items have been deleted successfully.`,
        })
      } else {
        const response = await fetch("/api/settlement/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "update_status",
            ids: selectedIds,
            status: action,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || "Failed to update items")
        }

        setItems(
          items.map((item) => {
            const updated = result.data.find((u: SettlementItem) => u.id === item.id)
            return updated || item
          }),
        )
        toast({
          title: "Items updated",
          description: `${selectedIds.length} items have been updated successfully.`,
        })
      }
    } catch (error) {
      toast({
        title: "Bulk action failed",
        description: error instanceof Error ? error.message : "There was an error performing the bulk action.",
        variant: "destructive",
      })
      console.error(error)
    } finally {
      setBulkActionLoading(false)
    }
  }

  // Notes handling
  const startEditingNotes = (id: string, currentNotes = "") => {
    setEditingNotes(id)
    setNotesText(currentNotes || "")
    setNotesPopoverOpen(true)

    // Focus the textarea after it renders
    setTimeout(() => {
      if (notesTextareaRef.current) {
        notesTextareaRef.current.focus()
      }
    }, 50)
  }

  const saveNotes = async (id: string) => {
    try {
      setActionInProgress(id)

      const response = await fetch(`/api/settlement/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes: notesText }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to save notes")
      }

      setItems(items.map((item) => (item.id === id ? result.data : item)))
      setEditingNotes(null)
      setNotesPopoverOpen(false)
      toast({
        title: "Notes saved",
        description: "Notes have been saved successfully.",
      })
    } catch (error) {
      toast({
        title: "Failed to save notes",
        description: error instanceof Error ? error.message : "There was an error saving the notes.",
        variant: "destructive",
      })
      console.error(error)
    } finally {
      setActionInProgress(null)
    }
  }

  const cancelEditingNotes = () => {
    setEditingNotes(null)
    setNotesPopoverOpen(false)
    setNotesText("")
  }

  // Handle popover close
  useEffect(() => {
    if (!notesPopoverOpen) {
      setEditingNotes(null)
    }
  }, [notesPopoverOpen])

  const problemCount = items.filter((item) => item.status === "problem").length
  const doneCount = items.filter((item) => item.status === "done").length
  const selectedCount = selectedItems.size

  // Format the last saved timestamp
  const formatLastSaved = (timestamp: string) => {
    const date = new Date(timestamp)
    return new Intl.DateTimeFormat("default", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date)
  }

  return (
    <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="h-8 w-8">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Dashboard</span>
            </Link>
          </Button>
          <div>
            <CardTitle className="text-xl font-bold">Settlement Tracker</CardTitle>
            {lastSaved && (
              <p className="text-xs text-muted-foreground mt-1">Last saved: {formatLastSaved(lastSaved)}</p>
            )}
          </div>
        </div>
        <Button onClick={handleSaveAll} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save All Changes
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="p-6">
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Enter MR Number"
            value={newMrNumber}
            onChange={(e) => setNewMrNumber(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
            disabled={isLoading}
          />
          <Button onClick={handleAddItem} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
              </>
            ) : (
              "Add"
            )}
          </Button>
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-1" disabled={isLoading}>
                <FileUp className="h-4 w-4" /> Import
              </Button>
            </DialogTrigger>
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
                <Button variant="outline" onClick={() => setImportDialogOpen(false)} disabled={isLoading}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...
                    </>
                  ) : (
                    "Import Numbers"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
              disabled={bulkActionLoading}
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              Mark as Problem
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-green-500 border-green-200 hover:bg-green-50 hover:text-green-600"
              onClick={() => handleBulkAction("done")}
              disabled={bulkActionLoading}
            >
              <Check className="h-4 w-4 mr-1" />
              Mark as Done
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction("none")} disabled={bulkActionLoading}>
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
              disabled={bulkActionLoading}
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
                      disabled={actionInProgress === item.id}
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
                      disabled={actionInProgress === item.id}
                    >
                      {actionInProgress === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        item.status === "problem" && <AlertCircle className="h-4 w-4" />
                      )}
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
                      disabled={actionInProgress === item.id}
                    >
                      {actionInProgress === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        item.status === "done" && <Check className="h-4 w-4" />
                      )}
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
                          ref={notesButtonRef}
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditingNotes(item.id, item.notes)}
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
                            ref={notesTextareaRef}
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            placeholder="Add notes about this MR number..."
                            className="min-h-[100px] mb-2"
                          />
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => saveNotes(item.id)}
                              disabled={actionInProgress === item.id}
                            >
                              {actionInProgress === item.id ? (
                                <>
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Saving...
                                </>
                              ) : (
                                "Save Notes"
                              )}
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
                      disabled={actionInProgress === item.id}
                    >
                      {actionInProgress === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="bg-muted/30 px-6 py-4">
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
      </CardFooter>
    </Card>
  )
}
