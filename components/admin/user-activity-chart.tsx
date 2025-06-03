"use client"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// Sample data - in a real app, this would come from your database
const data = [
  { month: "Jan", registrations: 4, logins: 24 },
  { month: "Feb", registrations: 7, logins: 35 },
  { month: "Mar", registrations: 5, logins: 28 },
  { month: "Apr", registrations: 10, logins: 42 },
  { month: "May", registrations: 12, logins: 50 },
  { month: "Jun", registrations: 8, logins: 45 },
]

export function UserActivityChart() {
  return (
    <ChartContainer
      config={{
        registrations: {
          label: "New Users",
          color: "hsl(var(--chart-1))",
        },
        logins: {
          label: "User Logins",
          color: "hsl(var(--chart-2))",
        },
      }}
      className="h-[300px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend />
          <Line type="monotone" dataKey="registrations" stroke="var(--color-registrations)" name="New Users" />
          <Line type="monotone" dataKey="logins" stroke="var(--color-logins)" name="User Logins" />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
