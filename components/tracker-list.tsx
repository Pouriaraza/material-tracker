"use client"

import { useState } from "react"
import { Edit, Trash2, Plus, BarChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { TrackerForm } from "@/components/tracker-form"
import { TrackerLogForm } from "@/components/tracker-log-form"
import { TrackerHistory } from "@/components/tracker-history"
import type { Tracker } from "@/types/tracker"

interface TrackerListProps {
  trackers: Tracker[]
  onUpdate: (tracker: Tracker) => void
  onDelete: (id: string) => void
}

export function TrackerList({ trackers, onUpdate, onDelete }: TrackerListProps) {
  const [selectedTracker, setSelectedTracker] = useState<Tracker | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showLogDialog, setShowLogDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)

  const handleUpdate = (updatedTracker: Tracker) => {
    onUpdate(updatedTracker)
    setShowEditDialog(false)
  }

  const handleAddProgress = (tracker: Tracker, amount: number) => {
    const newProgress = tracker.progress + amount
    const newLog = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      amount,
      note: "",
    }

    const updatedTracker = {
      ...tracker,
      progress: newProgress,
      logs: [...tracker.logs, newLog],
    }

    onUpdate(updatedTracker)
    setShowLogDialog(false)
  }

  if (trackers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">هیچ ردیابی در این دسته وجود ندارد</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {trackers.map((tracker) => (
        <Card key={tracker.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle>{tracker.title}</CardTitle>
              <div className="flex space-x-2 rtl:space-x-reverse">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedTracker(tracker)
                    setShowEditDialog(true)
                  }}
                >
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(tracker.id)}>
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tracker.description && <p className="text-sm text-muted-foreground">{tracker.description}</p>}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>پیشرفت</span>
                  <span>
                    {tracker.progress} / {tracker.target} {tracker.unit}
                  </span>
                </div>
                <Progress value={(tracker.progress / tracker.target) * 100} className="h-2" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedTracker(tracker)
                setShowHistoryDialog(true)
              }}
            >
              <BarChart className="h-4 w-4 mr-2" />
              تاریخچه
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelectedTracker(tracker)
                setShowLogDialog(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              ثبت پیشرفت
            </Button>
          </CardFooter>
        </Card>
      ))}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ویرایش ردیاب</DialogTitle>
          </DialogHeader>
          {selectedTracker && <TrackerForm tracker={selectedTracker} onSubmit={handleUpdate} />}
        </DialogContent>
      </Dialog>

      {/* Log Progress Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ثبت پیشرفت</DialogTitle>
          </DialogHeader>
          {selectedTracker && (
            <TrackerLogForm
              tracker={selectedTracker}
              onSubmit={(amount) => handleAddProgress(selectedTracker, amount)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>تاریخچه ردیاب</DialogTitle>
          </DialogHeader>
          {selectedTracker && <TrackerHistory tracker={selectedTracker} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
