import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { mrNumber } = await request.json()

    if (!mrNumber) {
      return NextResponse.json({ error: "MR Number is required" }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Check if the table exists
    const { error: tableCheckError } = await supabase.from("settlement_items").select("id").limit(1)

    if (tableCheckError) {
      // Table doesn't exist, create it
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS settlement_items (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          mr_number TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL DEFAULT 'none',
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
      `

      // Try to create the table using direct SQL
      try {
        // First try using rpc if available
        const { error: rpcError } = await supabase.rpc("execute_sql", {
          sql_query: createTableQuery,
        })

        if (rpcError) {
          return NextResponse.json(
            {
              error: "Failed to create table using RPC",
              details: rpcError.message,
            },
            { status: 500 },
          )
        }
      } catch (rpcCatchError) {
        return NextResponse.json(
          {
            error: "Exception when creating table using RPC",
            details: rpcCatchError instanceof Error ? rpcCatchError.message : String(rpcCatchError),
          },
          { status: 500 },
        )
      }
    }

    // Now try to insert the item
    try {
      const { data, error } = await supabase
        .from("settlement_items")
        .insert([{ mr_number: mrNumber, status: "none" }])
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          {
            error: "Failed to insert item",
            details: error.message,
            code: error.code,
          },
          { status: 500 },
        )
      }

      return NextResponse.json({ success: true, data })
    } catch (insertError) {
      return NextResponse.json(
        {
          error: "Exception when inserting item",
          details: insertError instanceof Error ? insertError.message : String(insertError),
        },
        { status: 500 },
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
