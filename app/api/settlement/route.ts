import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// GET: Fetch all settlement items
export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from("settlement_items")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching settlement items:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Unexpected error in GET /api/settlement:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

// POST: Add a new settlement item
export async function POST(request: Request) {
  try {
    const { mrNumber } = await request.json()

    if (!mrNumber) {
      return NextResponse.json({ error: "MR Number is required" }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Check if the MR number already exists
    const { data: existingItem, error: checkError } = await supabase
      .from("settlement_items")
      .select("id")
      .eq("mr_number", mrNumber)
      .maybeSingle()

    if (checkError) {
      console.error("Error checking for existing settlement item:", checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    if (existingItem) {
      return NextResponse.json({ error: `MR Number ${mrNumber} already exists` }, { status: 409 })
    }

    // Insert the new item
    const { data, error } = await supabase
      .from("settlement_items")
      .insert([{ mr_number: mrNumber, status: "none" }])
      .select()
      .single()

    if (error) {
      console.error("Error adding settlement item:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Unexpected error in POST /api/settlement:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
