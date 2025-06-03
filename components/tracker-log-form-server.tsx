"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface TrackerLogFormServerProps {
  trackerId: string
  unit: string
}

export function TrackerLogFormServer({ trackerId, unit }: TrackerLogFormServerProps) {
  const [amount, setAmount] = useState("1")
  const [note, setNote] = useState("")
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

      // Get current tracker
      const { data: tracker, error: trackerError } = await supabase
        .from("trackers")
        .select("progress")
        .eq("id", trackerId)
        .eq("owner_id", user.id)
        .single()

      if (trackerError) {
        setError("Failed to fetch tracker data")
        return
      }

      // Add log entry
      const { error: logError } = await supabase.from("tracker_logs").insert([
        {
          tracker_id: trackerId,
          amount: Number(amount),
          note,
          date: new Date().toISOString(),
        },
      ])

      if (logError) {
        setError(logError.message)
        return
      }

      // Update tracker progress
      const newProgress = tracker.progress + Number(amount)
      const { error: updateError } = await supabase
        .from("trackers")
        .update({ progress: newProgress })
        .eq("id", trackerId)

      if (updateError) {
        setError(updateError.message)
        return
      }

      router.push(`/trackers/${trackerId}`)
      router.refresh()
    } catch (err) {
      setError("An unexpected error occurred")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="amount">Amount ({unit})</Label>
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
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note about this progress"
          rows={3}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging progress...
          </>
        ) : (
          "Log Progress"
        )}
      </Button>
    </form>
  )
}
