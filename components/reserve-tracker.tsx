"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

// Add the missing imports at the top of the file
import { AlertCircle, Check, Trash2, FileUp, ArrowLeft } from "lucide-react"
import Link from "next/link"

type ReserveItem = {
  id: string
  mrNumber: string
  status: "none" | "problem" | "done"
}

export function ReserveTracker() {
  const [items, setItems] = useState<ReserveItem[]>([])
  const [newMrNumber, setNewMrNumber] = useState("")
  const [importText, setImportText] = useState("")
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  // Load items from localStorage on component mount
  useEffect(() => {
    const savedItems = localStorage.getItem("reserveTrackerItems")
    if (savedItems) {
      try {
        // Handle conversion from old format to new format with status
        const parsedItems = JSON.parse(savedItems)
        const convertedItems = parsedItems.map((item: any) => {
          // Convert from previous versions
          if (item.status !== undefined) {
            return item
          } else if (item.isDone) {
            return { ...item, status: "done" }
          } else if (item.hasProblem) {
            return { ...item, status: "problem" }
          } else {
            return { ...item, status: "none" }
          }
        })
        setItems(convertedItems)
      } catch (error) {
        console.error("Error parsing saved items:", error)
      }
    }
  }, [])

  // Save items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("reserveTrackerItems", JSON.stringify(items))
  }, [items])

  const addItem = () => {
    if (!newMrNumber.trim()) return

    const newItem: ReserveItem = {
      id: uuidv4(),
      mrNumber: newMrNumber.trim(),
      status: "none",
    }

    setItems([...items, newItem])
    setNewMrNumber("")
  }

  const setItemStatus = (id: string, status: "none" | "problem" | "done") => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          // If clicking the already active status, toggle it off
          if (item.status === status) {
            return { ...item, status: "none" }
          }
          // Otherwise, set the new status
          return { ...item, status }
        }
        return item
      }),
    )
  }

  const deleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const importMrNumbers = (text: string) => {
    if (!text.trim()) return

    // Split by newline, comma, or semicolon
    const numbers = text
      .split(/[\n,;]+/)
      .map((num) => num.trim())
      .filter((num) => num !== "")

    if (numbers.length === 0) return

    const newItems = numbers.map((mrNumber) => ({
      id: uuidv4(),
      mrNumber,
      status: "none" as const,
    }))

    setItems([...items, ...newItems])
    return numbers.length
  }

  const handleImport = () => {
    const count = importMrNumbers(importText)
    setImportText("")
    setImportDialogOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addItem()
    }
  }

  const problemCount = items.filter((item) => item.status === "problem").length
  const doneCount = items.filter((item) => item.status === "done").length

  return (
    <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="h-8 w-8">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Dashboard</span>
            </Link>
          </Button>
          <CardTitle className="text-xl font-bold">Reserve Tracker</CardTitle>
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
          <Button onClick={addItem}>Add</Button>
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-1">
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
        </div>

        <div className="border rounded-md overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr,80px,80px] bg-muted p-3 font-medium text-sm">
            <div>MR Number</div>
            <div className="text-center">Problem</div>
            <div className="text-center">Done</div>
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
                  className={`grid grid-cols-[1fr,80px,80px] items-center p-3 ${
                    item.status === "done"
                      ? "bg-green-50 dark:bg-green-950/20"
                      : item.status === "problem"
                        ? "bg-red-50 dark:bg-red-950/20"
                        : index % 2 === 0
                          ? "bg-white dark:bg-background"
                          : "bg-gray-50 dark:bg-muted/30"
                  }`}
                >
                  <div className="font-medium">{item.mrNumber}</div>
                  {/* Problem Checkbox */}
                  <div className="flex justify-center items-center">
                    <button
                      onClick={() => setItemStatus(item.id, "problem")}
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
                  <div className="flex justify-between items-center">
                    <div className="flex justify-center flex-1">
                      <button
                        onClick={() => setItemStatus(item.id, "done")}
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
                    <button
                      onClick={() => deleteItem(item.id)}
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
      <CardFooter className="bg-muted/30 px-6 py-4">
        <div className="text-sm text-muted-foreground">
          {items.length > 0 ? (
            <>
              Total: <span className="font-medium">{items.length}</span> • With Problems:{" "}
              <span className="font-medium text-red-500">{problemCount}</span> • Completed:{" "}
              <span className="font-medium text-green-500">{doneCount}</span> • Pending:{" "}
              <span className="font-medium">{items.length - problemCount - doneCount}</span>
            </>
          ) : (
            "Add MR numbers to track them here"
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
