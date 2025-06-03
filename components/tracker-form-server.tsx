"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

interface TrackerFormServerProps {
  trackerId?: string
  initialTitle?: string
  initialDescription?: string
  initialType?: "habit" | "goal"
  initialTarget?: number
  initialUnit?: string
  initialDate?: Date
}

export function TrackerFormServer({
  trackerId,
  initialTitle = "",
  initialDescription = "",
  initialType = "habit",
  initialTarget = 1,
  initialUnit = "",
  initialDate = new Date(),
}: TrackerFormServerProps) {
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [type, setType] = useState<"habit" | "goal">(initialType)
  const [target, setTarget] = useState(initialTarget.toString())
  const [unit, setUnit] = useState(initialUnit)
  const [date, setDate] = useState<Date | undefined>(initialDate)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      if (trackerId) {
        // Update existing tracker
        const { error } = await supabase
          .from("trackers")
          .update({
            title,
            description,
            type,
            target: Number(target),
            unit,
            start_date: date?.toISOString() || new Date().toISOString(),
          })
          .eq("id", trackerId)
          .eq("owner_id", user.id)

        if (error) {
          setError(error.message)
          return
        }
      } else {
        // Create new tracker
        const { error } = await supabase.from("trackers").insert([
          {
            title,
            description,
            type,
            target: Number(target),
            unit,
            start_date: date?.toISOString() || new Date().toISOString(),
            progress: 0,
            owner_id: user.id,
          },
        ])

        if (error) {
          setError(error.message)
          return
        }
      }

      router.push("/trackers")
      router.refresh()
    } catch (err) {
      setError("An unexpected error occurred")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Example: Daily Walking"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="More details about this tracker"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Tracker Type</Label>
        <RadioGroup
          value={type}
          onValueChange={(value) => setType(value as "habit" | "goal")}
          className="flex space-x-4 space-y-0"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="habit" id="habit" />
            <Label htmlFor="habit">Habit</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="goal" id="goal" />
            <Label htmlFor="goal">Goal</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="target">Target</Label>
          <Input
            id="target"
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required
            min="1"
            placeholder="Amount"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Input
            id="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            required
            placeholder="Example: kilometers"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Start Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
          </PopoverContent>
        </Popover>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {trackerId ? "Updating..." : "Creating..."}
          </>
        ) : trackerId ? (
          "Update Tracker"
        ) : (
          "Create Tracker"
        )}
      </Button>
    </form>
  )
}
