import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export type SettlementItem = {
  id: string
  mr_number: string
  status: "none" | "problem" | "done"
  notes?: string | null
  created_at: string
  updated_at: string
}

// Check if the settlement_items table exists
export async function checkSettlementItemsTable(): Promise<boolean> {
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
export async function getSettlementItems(): Promise<SettlementItem[]> {
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

// Add a new settlement item using the API endpoint
export async function addSettlementItem(mrNumber: string): Promise<SettlementItem> {
  if (!mrNumber || typeof mrNumber !== "string") {
    throw new Error("Invalid MR number provided")
  }

  try {
    // Use the API endpoint to add the item
    const response = await fetch("/api/test-settlement-add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mrNumber }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Error from API:", errorData)
      throw new Error(errorData.error || `Failed to add MR number: ${response.statusText}`)
    }

    const result = await response.json()

    if (!result.success || !result.data) {
      throw new Error("Failed to add MR number: No data returned from API")
    }

    return result.data
  } catch (error) {
    console.error("Error in addSettlementItem:", error)
    throw error
  }
}

// Update the status of a settlement item
export async function updateSettlementItemStatus(
  id: string,
  status: "none" | "problem" | "done",
): Promise<SettlementItem> {
  if (!id) {
    throw new Error("Invalid item ID provided")
  }

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("settlement_items")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating settlement item status:", error)
    throw new Error(`Failed to update status: ${error.message}`)
  }

  if (!data) {
    throw new Error("Failed to update status: No data returned from database")
  }

  return data
}

// Update the notes of a settlement item
export async function updateSettlementItemNotes(id: string, notes: string): Promise<SettlementItem> {
  if (!id) {
    throw new Error("Invalid item ID provided")
  }

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("settlement_items")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating settlement item notes:", error)
    throw new Error(`Failed to update notes: ${error.message}`)
  }

  if (!data) {
    throw new Error("Failed to update notes: No data returned from database")
  }

  return data
}

// Delete a settlement item
export async function deleteSettlementItem(id: string): Promise<void> {
  if (!id) {
    throw new Error("Invalid item ID provided")
  }

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { error } = await supabase.from("settlement_items").delete().eq("id", id)

  if (error) {
    console.error("Error deleting settlement item:", error)
    throw new Error(`Failed to delete item: ${error.message}`)
  }
}

// Import multiple settlement items
export async function importSettlementItems(mrNumbers: string[]): Promise<{
  data: SettlementItem[]
  duplicatesCount: number
}> {
  if (!Array.isArray(mrNumbers) || mrNumbers.length === 0) {
    throw new Error("Invalid MR numbers provided")
  }

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  // Check if the table exists
  const tableExists = await checkSettlementItemsTable()
  if (!tableExists) {
    throw new Error("Settlement items table does not exist. Please run the migration first.")
  }

  // Check for existing MR numbers
  const { data: existingItems, error: checkError } = await supabase
    .from("settlement_items")
    .select("mr_number")
    .in("mr_number", mrNumbers)

  if (checkError) {
    console.error("Error checking for existing settlement items:", checkError)
    throw new Error(`Failed to check for existing MR numbers: ${checkError.message}`)
  }

  const existingMrNumbers = new Set((existingItems || []).map((item) => item.mr_number))
  const newMrNumbers = mrNumbers.filter((mrNumber) => !existingMrNumbers.has(mrNumber))

  if (newMrNumbers.length === 0) {
    return { data: [], duplicatesCount: mrNumbers.length }
  }

  const itemsToInsert = newMrNumbers.map((mrNumber) => ({
    mr_number: mrNumber,
    status: "none",
  }))

  const { data, error } = await supabase.from("settlement_items").insert(itemsToInsert).select()

  if (error) {
    console.error("Error importing settlement items:", error)
    throw new Error(`Failed to import MR numbers: ${error.message}`)
  }

  return {
    data: data || [],
    duplicatesCount: mrNumbers.length - newMrNumbers.length,
  }
}

// Save all settlement items (this is a placeholder function that just returns the current timestamp)
export async function saveAllSettlementItems(): Promise<{ success: boolean; timestamp: string }> {
  // In a real application, you might want to perform some batch operation here
  // For now, we'll just return a success response with the current timestamp
  return {
    success: true,
    timestamp: new Date().toISOString(),
  }
}

// Bulk update status for multiple settlement items
export async function bulkUpdateSettlementStatus(
  ids: string[],
  status: "none" | "problem" | "done",
): Promise<SettlementItem[]> {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("Invalid item IDs provided")
  }

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("settlement_items")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", ids)
    .select()

  if (error) {
    console.error("Error bulk updating settlement items:", error)
    throw new Error(`Failed to update items: ${error.message}`)
  }

  return data || []
}

// Bulk delete settlement items
export async function bulkDeleteSettlementItems(ids: string[]): Promise<void> {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("Invalid item IDs provided")
  }

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { error } = await supabase.from("settlement_items").delete().in("id", ids)

  if (error) {
    console.error("Error bulk deleting settlement items:", error)
    throw new Error(`Failed to delete items: ${error.message}`)
  }
}
