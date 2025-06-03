"use client"

import { useState, useEffect } from "react"
import { Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface Column {
  id: string
  name: string
  type: "text" | "number" | "date" | "checkbox"
}

interface ColumnFilterPopoverProps {
  column: Column
  value: string
  onChange: (value: string) => void
  isActive: boolean
  onOpenChange?: (open: boolean) => void
}

export function ColumnFilterPopover({ column, value, onChange, isActive, onOpenChange }: ColumnFilterPopoverProps) {
  const [filterValue, setFilterValue] = useState(value)

  // Update local state when external value changes
  useEffect(() => {
    setFilterValue(value)
  }, [value])

  const handleApplyFilter = () => {
    onChange(filterValue)
  }

  const handleClearFilter = () => {
    setFilterValue("")
    onChange("")
  }

  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 relative">
          <Filter className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
          {isActive && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary"></span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Filter: {column.name}</h4>
            <Input
              placeholder={`Filter by ${column.name}...`}
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex justify-between">
            <Button variant="outline" size="sm" onClick={handleClearFilter}>
              Clear
            </Button>
            <Button size="sm" onClick={handleApplyFilter}>
              Apply Filter
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
