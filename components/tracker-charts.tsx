"use client"

import { useMemo } from "react"
import { format } from "date-fns"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Tracker } from "@/types/tracker"

interface TrackerChartsProps {
  tracker: Tracker
}

export function TrackerCharts({ tracker }: TrackerChartsProps) {
  // Prepare data for charts
  const chartData = useMemo(() => {
    // Sort logs by date (oldest first)
    const sortedLogs = [...tracker.logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Map logs to chart data format
    return sortedLogs.map((log) => ({
      date: format(new Date(log.date), "MM/dd"),
      amount: log.amount,
      // Calculate cumulative progress
      cumulative: sortedLogs
        .filter((l) => new Date(l.date) <= new Date(log.date))
        .reduce((sum, l) => sum + l.amount, 0),
    }))
  }, [tracker.logs])

  return (
    <Tabs defaultValue="bar" className="w-full h-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="bar">Bar Chart</TabsTrigger>
        <TabsTrigger value="line">Progress Line</TabsTrigger>
      </TabsList>

      <TabsContent value="bar" className="h-[calc(100%-40px)]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              formatter={(value) => [`${value} ${tracker.unit}`, "Amount"]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Bar dataKey="amount" fill="#3b82f6" name={tracker.unit} />
          </BarChart>
        </ResponsiveContainer>
      </TabsContent>

      <TabsContent value="line" className="h-[calc(100%-40px)]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              formatter={(value) => [`${value} ${tracker.unit}`, "Total Progress"]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#3b82f6"
              name="Total Progress"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </TabsContent>
    </Tabs>
  )
}
