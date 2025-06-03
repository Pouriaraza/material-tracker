"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, RefreshCw } from "lucide-react"

// Sample data - in a real app, this would come from your database
const sampleLogs = [
  {
    id: 1,
    timestamp: "2023-05-08 09:15:23",
    user: "pouria.raz@mtnirancell.ir",
    action: "Login",
    details: "User logged in successfully",
  },
  {
    id: 2,
    timestamp: "2023-05-08 09:20:45",
    user: "pouria.raz@mtnirancell.ir",
    action: "Create",
    details: "Created new sheet 'Q2 Budget'",
  },
  {
    id: 3,
    timestamp: "2023-05-08 10:05:12",
    user: "pouria.raz@mtnirancell.ir",
    action: "Update",
    details: "Updated tracker 'Project Timeline'",
  },
  {
    id: 4,
    timestamp: "2023-05-08 11:30:08",
    user: "pouria.raz@mtnirancell.ir",
    action: "Delete",
    details: "Deleted sheet 'Old Data'",
  },
  {
    id: 5,
    timestamp: "2023-05-08 13:45:33",
    user: "pouria.raz@mtnirancell.ir",
    action: "Export",
    details: "Exported 'Sales Data' to Excel",
  },
]

export function ActivityLogs() {
  const [logs, setLogs] = useState(sampleLogs)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)

  const handleRefresh = () => {
    setLoading(true)
    // In a real app, this would fetch fresh data from your API
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }

  const filteredLogs = logs.filter((log) => {
    if (filter !== "all" && log.action.toLowerCase() !== filter) {
      return false
    }
    if (
      search &&
      !log.details.toLowerCase().includes(search.toLowerCase()) &&
      !log.user.toLowerCase().includes(search.toLowerCase())
    ) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="w-full sm:w-[180px]">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="export">Export</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="hidden md:table-cell">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">{log.timestamp}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{log.user}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded-full ${
                        log.action === "Login"
                          ? "bg-blue-100 text-blue-800"
                          : log.action === "Create"
                            ? "bg-green-100 text-green-800"
                            : log.action === "Update"
                              ? "bg-yellow-100 text-yellow-800"
                              : log.action === "Delete"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{log.details}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
