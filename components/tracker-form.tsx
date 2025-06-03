"use client"

import type React from "react"

import { useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import type { Tracker } from "@/types/tracker"
import { cn } from "@/lib/utils"

interface TrackerFormProps {
  tracker?: Tracker
  onSubmit: (tracker: Tracker) => void
}

export function TrackerForm({ tracker, onSubmit }: TrackerFormProps) {
  const [title, setTitle] = useState(tracker?.title || "")
  const [description, setDescription] = useState(tracker?.description || "")
  const [type, setType] = useState<"habit" | "goal">(tracker?.type || "habit")
  const [target, setTarget] = useState(tracker?.target?.toString() || "")
  const [unit, setUnit] = useState(tracker?.unit || "")
  const [date, setDate] = useState<Date | undefined>(tracker?.startDate ? new Date(tracker.startDate) : new Date())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newTracker: Tracker = {
      id: tracker?.id || uuidv4(),
      title,
      description,
      type,
      target: Number.parseInt(target),
      unit,
      startDate: date?.toISOString() || new Date().toISOString(),
      progress: tracker?.progress || 0,
      logs: tracker?.logs || [],
      createdAt: tracker?.createdAt || new Date().toISOString(),
    }

    onSubmit(newTracker)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">عنوان</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="مثال: پیاده‌روی روزانه"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">توضیحات</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="توضیحات بیشتر درباره این ردیاب"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>نوع ردیاب</Label>
        <RadioGroup
          value={type}
          onValueChange={(value) => setType(value as "habit" | "goal")}
          className="flex space-x-4 space-y-0 rtl:space-x-reverse"
        >
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <RadioGroupItem value="habit" id="habit" />
            <Label htmlFor="habit">عادت</Label>
          </div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <RadioGroupItem value="goal" id="goal" />
            <Label htmlFor="goal">هدف</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="target">هدف</Label>
          <Input
            id="target"
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required
            min="1"
            placeholder="مقدار"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">واحد</Label>
          <Input
            id="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            required
            placeholder="مثال: کیلومتر"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>تاریخ شروع</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-full justify-start text-right font-normal", !date && "text-muted-foreground")}
            >
              <CalendarIcon className="ml-2 h-4 w-4" />
              {date ? format(date, "PPP") : "انتخاب تاریخ"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
          </PopoverContent>
        </Popover>
      </div>

      <Button type="submit" className="w-full">
        {tracker ? "بروزرسانی ردیاب" : "ایجاد ردیاب"}
      </Button>
    </form>
  )
}
