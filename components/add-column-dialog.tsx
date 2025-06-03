"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface AddColumnDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddColumn: (name: string, type: "text" | "number" | "date" | "checkbox") => void
}

export function AddColumnDialog({ open, onOpenChange, onAddColumn }: AddColumnDialogProps) {
  const [columnName, setColumnName] = useState("")
  const [columnType, setColumnType] = useState<"text" | "number" | "date" | "checkbox">("text")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (columnName.trim()) {
      onAddColumn(columnName, columnType)
      setColumnName("")
      setColumnType("text")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Column</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="column-name">Column Name</Label>
              <Input
                id="column-name"
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                placeholder="Example: Value"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label>Data Type</Label>
              <RadioGroup value={columnType} onValueChange={(value) => setColumnType(value as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="text" id="text" />
                  <Label htmlFor="text">Text</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="number" id="number" />
                  <Label htmlFor="number">Number</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="date" id="date" />
                  <Label htmlFor="date">Date</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="checkbox" id="checkbox" />
                  <Label htmlFor="checkbox">Checkbox</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!columnName.trim()}>
              Add Column
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
