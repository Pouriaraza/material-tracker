"use client"

import { format } from "date-fns"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Tracker } from "@/types/tracker"

interface TrackerHistoryProps {
  tracker: Tracker
}

export function TrackerHistory({ tracker }: TrackerHistoryProps) {
  // Sort logs by date (newest first)
  const sortedLogs = [...tracker.logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Prepare data for chart
  const chartData = [...tracker.logs]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((log) => ({
      date: format(new Date(log.date), "MM/dd"),
      amount: log.amount,
    }))

  return (
    <Tabs defaultValue="chart" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="chart">نمودار</TabsTrigger>
        <TabsTrigger value="logs">تاریخچه</TabsTrigger>
      </TabsList>

      <TabsContent value="chart" className="pt-4">
        {chartData.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#3b82f6" name={tracker.unit} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">هنوز هیچ پیشرفتی ثبت نشده است</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="logs" className="pt-4">
        {sortedLogs.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>تاریخ</TableHead>
                <TableHead>مقدار</TableHead>
                <TableHead>یادداشت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{format(new Date(log.date), "yyyy/MM/dd HH:mm")}</TableCell>
                  <TableCell>
                    {log.amount} {tracker.unit}
                  </TableCell>
                  <TableCell>{log.note || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">هنوز هیچ پیشرفتی ثبت نشده است</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
