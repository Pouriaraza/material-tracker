import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({
    success: false,
    message: "Please run the SQL migration manually to create the settlement_items table",
  })
}
