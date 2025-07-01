import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/supabase/database.types"

// Create a single supabase client for the entire client-side application
export const createClient = () => {
  return createClientComponentClient<Database>()
}

// Create client with explicit URL and key for cases where auth helpers don't work
export const createDirectClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL=https://idxihzbsgucrjtpwvkrg.supabase.co
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeGloemJzZ3Vjcmp0cHd2a3JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MzM5MjgsImV4cCI6MjA2MjAwOTkyOH0.2rcXgIZwOXyrsn6P_09YxUQr96GPdK652X1xroEP104

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables")
  }

  const { createClient } = require("@supabase/supabase-js")
  return createClient(supabaseUrl, supabaseAnonKey)
}
