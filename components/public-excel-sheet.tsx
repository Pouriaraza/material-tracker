"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PublicExcelSheetProps {
  sheetData: any
  sheetName: string
}

export function PublicExcelSheet({ sheetData, sheetName }: PublicExcelSheetProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredData, setFilteredData] = useState(sheetData)

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(sheetData)
      return
    }

    const term = searchTerm.toLowerCase()
    const filtered = sheetData.filter((row: any) =>
      Object.values(row).some((value: any) => value && String(value).toLowerCase().includes(term)),
    )
    setFilteredData(filtered)
  }, [searchTerm, sheetData])

  if (!sheetData || sheetData.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-lg text-gray-500">No data available in this sheet.</p>
      </div>
    )
  }

  // Get column headers from the first row
  const columns = Object.keys(sheetData[0])

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{sheetName}</h1>
        <Alert className="max-w-fit bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-800">Shared view (read-only)</AlertDescription>
        </Alert>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
        <Input
          type="search"
          placeholder="Search sheet..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="border rounded-md overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-b">
              {columns.map((column, index) => (
                <th key={index} className="px-4 py-2 text-left font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row: any, rowIndex: number) => (
              <tr key={rowIndex} className="border-b last:border-0 hover:bg-gray-50">
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="px-4 py-2">
                    {row[column] !== null && row[column] !== undefined ? String(row[column]) : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-4">
          <p className="text-gray-500">No matching results found.</p>
        </div>
      )}
    </div>
  )
}
