"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export type ReserveItem = {
  id: string
  mr_number: string
  status: "none" | "problem" | "done"
  notes?: string
  created_at: string
  updated_at: string
  priority?: "low" | "medium" | "high"
  category?: string
  due_date?: string
}

export async function getReserveItems() {
  const supabase = createClient()

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    redirect("/login")
  }

  const { data, error } = await supabase.from("reserve_items").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching reserve items:", error)
    throw new Error("Failed to fetch reserve items")
  }

  return data as ReserveItem[]
}

export async function addReserveItem(
  mr_number: string,
  category?: string,
  priority?: "low" | "medium" | "high",
  due_date?: string,
) {
  const supabase = createClient()

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    redirect("/login")
  }

  // Check if the MR number already exists
  const { data: existingItems } = await supabase
    .from("reserve_items")
    .select("id")
    .eq("user_id", session.session.user.id)
    .eq("mr_number", mr_number)

  // If it already exists, return early
  if (existingItems && existingItems.length > 0) {
    throw new Error("MR Number already exists")
  }

  const { data, error } = await supabase
    .from("reserve_items")
    .insert({
      user_id: session.session.user.id,
      mr_number,
      status: "none",
      notes: "",
      priority: priority || "medium",
      category: category || "",
      due_date: due_date || null,
    })
    .select()
    .single()

  if (error) {
    console.error("Error adding reserve item:", error)
    throw new Error("Failed to add reserve item")
  }

  revalidatePath("/reserve-tracker")
  return data as ReserveItem
}

export async function updateReserveItemStatus(id: string, status: "none" | "problem" | "done") {
  const supabase = createClient()

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    redirect("/login")
  }

  const { data, error } = await supabase
    .from("reserve_items")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating reserve item:", error)
    throw new Error("Failed to update reserve item")
  }

  revalidatePath("/reserve-tracker")
  return data as ReserveItem
}

export async function updateReserveItemNotes(id: string, notes: string) {
  const supabase = createClient()

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    redirect("/login")
  }

  const { data, error } = await supabase
    .from("reserve_items")
    .update({
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating reserve item notes:", error)
    throw new Error("Failed to update reserve item notes")
  }

  revalidatePath("/reserve-tracker")
  return data as ReserveItem
}

export async function updateReserveItemPriority(id: string, priority: "low" | "medium" | "high") {
  const supabase = createClient()

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    redirect("/login")
  }

  const { data, error } = await supabase
    .from("reserve_items")
    .update({
      priority,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating reserve item priority:", error)
    throw new Error("Failed to update reserve item priority")
  }

  revalidatePath("/reserve-tracker")
  return data as ReserveItem
}

export async function updateReserveItemCategory(id: string, category: string) {
  const supabase = createClient()

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    redirect("/login")
  }

  const { data, error } = await supabase
    .from("reserve_items")
    .update({
      category,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating reserve item category:", error)
    throw new Error("Failed to update reserve item category")
  }

  revalidatePath("/reserve-tracker")
  return data as ReserveItem
}

export async function updateReserveItemDueDate(id: string, due_date: string | null) {
  const supabase = createClient()

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    redirect("/login")
  }

  const { data, error } = await supabase
    .from("reserve_items")
    .update({
      due_date,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating reserve item due date:", error)
    throw new Error("Failed to update reserve item due date")
  }

  revalidatePath("/reserve-tracker")
  return data as ReserveItem
}

export async function deleteReserveItem(id: string) {
  const supabase = createClient()

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    redirect("/login")
  }

  const { error } = await supabase.from("reserve_items").delete().eq("id", id)

  if (error) {
    console.error("Error deleting reserve item:", error)
    throw new Error("Failed to delete reserve item")
  }

  revalidatePath("/reserve-tracker")
}

export async function importReserveItems(mrNumbers: string[]) {
  const supabase = createClient()

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    redirect("/login")
  }

  // First, get all existing MR numbers for this user
  const { data: existingItems } = await supabase
    .from("reserve_items")
    .select("mr_number")
    .eq("user_id", session.session.user.id)

  const existingMrNumbers = new Set((existingItems || []).map((item) => item.mr_number))

  // Filter out duplicates within the import list and against existing items
  const uniqueMrNumbers: string[] = []
  const seenMrNumbers = new Set<string>()
  const duplicates: string[] = []

  for (const mrNumber of mrNumbers) {
    if (seenMrNumbers.has(mrNumber) || existingMrNumbers.has(mrNumber)) {
      duplicates.push(mrNumber)
    } else {
      uniqueMrNumbers.push(mrNumber)
      seenMrNumbers.add(mrNumber)
    }
  }

  // If there are no unique MR numbers to import, return early
  if (uniqueMrNumbers.length === 0) {
    return {
      data: [],
      duplicatesCount: duplicates.length,
      duplicates,
    }
  }

  // Create items for the unique MR numbers
  const items = uniqueMrNumbers.map((mr_number) => ({
    user_id: session.session!.user.id,
    mr_number,
    status: "none" as const,
    notes: "",
    priority: "medium" as const,
    category: "",
  }))

  const { data, error } = await supabase.from("reserve_items").insert(items).select()

  if (error) {
    console.error("Error importing reserve items:", error)
    throw new Error("Failed to import reserve items")
  }

  revalidatePath("/reserve-tracker")
  return {
    data: data as ReserveItem[],
    duplicatesCount: duplicates.length,
    duplicates,
  }
}

export async function saveAllReserveItems() {
  // This function doesn't need to do anything special since all changes
  // are already saved to the database immediately.
  // It's just here to provide a "save" action for user confidence.
  revalidatePath("/reserve-tracker")
  return { success: true, timestamp: new Date().toISOString() }
}

export async function bulkUpdateStatus(ids: string[], status: "none" | "problem" | "done") {
  const supabase = createClient()

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    redirect("/login")
  }

  const { data, error } = await supabase
    .from("reserve_items")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids)
    .select()

  if (error) {
    console.error("Error updating reserve items:", error)
    throw new Error("Failed to update reserve items")
  }

  revalidatePath("/reserve-tracker")
  return data as ReserveItem[]
}

export async function bulkUpdatePriority(ids: string[], priority: "low" | "medium" | "high") {
  const supabase = createClient()

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    redirect("/login")
  }

  const { data, error } = await supabase
    .from("reserve_items")
    .update({
      priority,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids)
    .select()

  if (error) {
    console.error("Error updating reserve items priority:", error)
    throw new Error("Failed to update reserve items priority")
  }

  revalidatePath("/reserve-tracker")
  return data as ReserveItem[]
}

export async function bulkUpdateCategory(ids: string[], category: string) {
  const supabase = createClient()

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    redirect("/login")
  }

  const { data, error } = await supabase
    .from("reserve_items")
    .update({
      category,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids)
    .select()

  if (error) {
    console.error("Error updating reserve items category:", error)
    throw new Error("Failed to update reserve items category")
  }

  revalidatePath("/reserve-tracker")
  return data as ReserveItem[]
}

export async function bulkDeleteItems(ids: string[]) {
  const supabase = createClient()

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    redirect("/login")
  }

  const { error } = await supabase.from("reserve_items").delete().in("id", ids)

  if (error) {
    console.error("Error deleting reserve items:", error)
    throw new Error("Failed to delete reserve items")
  }

  revalidatePath("/reserve-tracker")
}

export async function getCategories() {
  const supabase = createClient()

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    redirect("/login")
  }

  const { data, error } = await supabase
    .from("reserve_items")
    .select("category")
    .eq("user_id", session.session.user.id)
    .not("category", "eq", "")
    .not("category", "is", null)

  if (error) {
    console.error("Error fetching categories:", error)
    throw new Error("Failed to fetch categories")
  }

  // Extract unique categories
  const categories = [...new Set(data.map((item) => item.category))].filter(Boolean)
  return categories as string[]
}

export async function exportReserveItems() {
  const items = await getReserveItems()

  // Format items for export
  const formattedItems = items.map((item) => ({
    "MR Number": item.mr_number,
    Status: item.status === "none" ? "Pending" : item.status === "done" ? "Done" : "Problem",
    Priority: item.priority || "Medium",
    Category: item.category || "",
    "Due Date": item.due_date || "",
    Notes: item.notes || "",
    Created: new Date(item.created_at).toLocaleDateString(),
    Updated: new Date(item.updated_at).toLocaleDateString(),
  }))

  return formattedItems
}
