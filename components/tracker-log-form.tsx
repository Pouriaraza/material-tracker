"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Tracker } from "@/types/tracker"

interface TrackerLogFormProps {
  tracker: Tracker
  onSubmit: (amount: number) => void
}

export function TrackerLogForm({ tracker, onSubmit }: TrackerLogFormProps) {
  const [amount, setAmount] = useState("1")
  const [note, setNote] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(Number.parseFloat(amount))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="amount">مقدار ({tracker.unit})</Label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          min="0.1"
          step="0.1"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">یادداشت (اختیاری)</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="یادداشتی برای این پیشرفت"
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full">
        ثبت پیشرفت
      </Button>
    </form>
  )
}
