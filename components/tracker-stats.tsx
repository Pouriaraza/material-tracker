"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts"
import type { Tracker } from "@/types/tracker"

interface TrackerStatsProps {
  trackers: Tracker[]
}

export function TrackerStats({ trackers }: TrackerStatsProps) {
  // Calculate completion percentage for each tracker
  const trackersWithPercentage = trackers.map((tracker) => ({
    name: tracker.title,
    value: Math.min(100, (tracker.progress / tracker.target) * 100),
    type: tracker.type,
  }))

  // Calculate average completion percentage
  const averageCompletion =
    trackersWithPercentage.length > 0
      ? trackersWithPercentage.reduce((sum, t) => sum + t.value, 0) / trackersWithPercentage.length
      : 0

  // Count trackers by type
  const habitCount = trackers.filter((t) => t.type === "habit").length
  const goalCount = trackers.filter((t) => t.type === "goal").length

  // Data for type distribution chart
  const typeData = [
    { name: "عادت‌ها", value: habitCount },
    { name: "اهداف", value: goalCount },
  ].filter((item) => item.value > 0)

  // Colors for the charts
  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>وضعیت پیشرفت</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center">
            <div className="text-4xl font-bold mb-2">{averageCompletion.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground mb-6">میانگین پیشرفت همه ردیاب‌ها</div>
            <div className="h-[200px] w-full">
              {trackersWithPercentage.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={trackersWithPercentage}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {trackersWithPercentage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>انواع ردیاب‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center">
            <div className="text-4xl font-bold mb-2">{trackers.length}</div>
            <div className="text-sm text-muted-foreground mb-6">تعداد کل ردیاب‌ها</div>
            <div className="h-[200px] w-full">
              {typeData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
