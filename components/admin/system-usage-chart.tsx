"use client"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// Sample data - in a real app, this would come from your database
const data = [
  { name: "Sheets", count: 42, storage: 15 },
  { name: "Trackers", count: 28, storage: 8 },
  { name: "Reserves", count: 65, storage: 22 },
  { name: "Users", count: 15, storage: 5 },
]

export function SystemUsageChart() {
  return (
    <ChartContainer
      config={{
        count: {
          label: "Item Count",
          color: "hsl(var(--chart-1))",
        },
        storage: {
          label: "Storage (MB)",
          color: "hsl(var(--chart-2))",
        },
      }}
      className="h-[300px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend />
          <Bar dataKey="count" fill="var(--color-count)" name="Item Count" />
          <Bar dataKey="storage" fill="var(--color-storage)" name="Storage (MB)" />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
