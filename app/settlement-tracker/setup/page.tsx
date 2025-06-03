"use client"

import { Button } from "@/components/ui/button"
import { Database, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function SettlementTrackerSetupPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-4">
        <Link href="/settlement-tracker">
          <Button variant="outline" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settlement Tracker
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4 flex items-center">
          <Database className="mr-2 h-6 w-6" /> Settlement Tracker Setup
        </h1>

        <p className="mb-4">
          To set up the Settlement Tracker, you need to create the settlement_items table in your database. You can run
          the SQL below to create the table:
        </p>

        <div className="bg-gray-800 text-gray-200 p-4 rounded overflow-auto mb-6">
          <pre className="text-sm">
            {`CREATE TABLE IF NOT EXISTS settlement_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mr_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'none',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);`}
          </pre>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Run SQL Migration</h2>
          <p className="mb-4">Click the button below to run the SQL migration directly:</p>

          {/* SQL execution block */}
          <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
            <h3 className="font-medium mb-2">Execute SQL Migration</h3>
            <p className="text-sm text-gray-600 mb-4">This will create the settlement_items table in your database.</p>

            <div className="sql-execution-block">
              {/* This is where the SQL execution block would go */}
              <div className="mt-4">
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    // This would be handled by the SQL execution block
                    alert("Please use the SQL execution block below to run the migration.")
                  }}
                >
                  <Database className="mr-2 h-4 w-4" /> Run SQL Migration
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Manual Setup</h2>
          <p>If you prefer to set up the table manually, follow these steps:</p>
          <ol className="list-decimal list-inside mt-2 space-y-2">
            <li>Log in to your Supabase dashboard</li>
            <li>Navigate to the SQL Editor</li>
            <li>Create a new query</li>
            <li>Copy and paste the SQL above</li>
            <li>Run the query</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
