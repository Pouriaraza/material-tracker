import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SettlementTrackerClient } from "@/components/settlement-tracker-client"
import { checkIsAdmin } from "@/lib/auth-utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { FileText, Database } from "lucide-react"
import { cookies } from "next/headers"

export async function SettlementTrackerServer() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Check if user is admin
  const isAdmin = await checkIsAdmin()

  try {
    // Check if the table exists
    const tableExists = await checkSettlementItemsTable()

    if (!tableExists) {
      return (
        <div className="container mx-auto py-6">
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded mb-6">
            <p className="font-bold flex items-center">
              <Database className="mr-2 h-5 w-5" /> Settlement Items Table Not Found
            </p>
            <p className="mt-2">
              The settlement_items table does not exist in the database. Please run the SQL below to create it:
            </p>
            <div className="mt-4 bg-gray-800 text-gray-200 p-4 rounded overflow-auto">
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
            <p className="mt-4">
              You can run this SQL in the Supabase dashboard or use the inline SQL execution below:
            </p>
            <div className="mt-4">
              <Link href="/settlement-tracker/setup">
                <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                  <Database className="mr-2 h-4 w-4" /> Run SQL Migration
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )
    }

    const items = await getSettlementItems()

    return (
      <div className="container mx-auto py-6">
        {isAdmin && (
          <div className="mb-4 flex justify-end">
            <Button
              variant="outline"
              className="bg-purple-600 text-white hover:bg-purple-700 border-purple-600"
              asChild
            >
              <Link href="/settlement-tracker/permissions">
                <FileText className="mr-2 h-4 w-4" /> Manage Permissions
              </Link>
            </Button>
          </div>
        )}
        <SettlementTrackerClient initialItems={items} />
      </div>
    )
  } catch (error) {
    console.error("Error in SettlementTrackerServer:", error)
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error loading Settlement Tracker</p>
          <p>There was a problem loading your data. Please try again later.</p>
          <p className="mt-2 text-sm">Error details: {String(error)}</p>
        </div>
      </div>
    )
  }
}

// Helper function to check if the settlement_items table exists
async function checkSettlementItemsTable(): Promise<boolean> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  try {
    // Check if the table exists by attempting to query it
    const { error } = await supabase.from("settlement_items").select("id").limit(1)

    // If there's no error, the table exists
    if (!error) {
      return true
    }

    // If the error is about the table not existing, return false
    if (error.message.includes("does not exist")) {
      return false
    }

    // For any other error, log it and return false
    console.error("Error checking settlement_items table:", error)
    return false
  } catch (error) {
    console.error("Error in checkSettlementItemsTable:", error)
    return false
  }
}

// Get all settlement items
async function getSettlementItems() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  try {
    // Check if the table exists
    const tableExists = await checkSettlementItemsTable()

    if (!tableExists) {
      // Return empty array if table doesn't exist
      return []
    }

    const { data, error } = await supabase
      .from("settlement_items")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching settlement items:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getSettlementItems:", error)
    return []
  }
}
