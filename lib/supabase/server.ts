import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/lib/supabase/database.types"

// Create a supabase client for server components
export const createClient = () => {
  return createServerComponentClient<Database>({ cookies })
}
