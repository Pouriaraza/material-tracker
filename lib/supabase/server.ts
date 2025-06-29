import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/lib/supabase/database.types"

// Create a supabase client for server components
export const createClient = (cookieStore?: ReturnType<typeof cookies>) => {
  const cookieStoreToUse = cookieStore || cookies()
  return createServerComponentClient<Database>({ cookies: () => cookieStoreToUse })
}
