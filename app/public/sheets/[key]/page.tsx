import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { PublicExcelSheet } from "@/components/public-excel-sheet"

export const dynamic = "force-dynamic"

export default async function PublicSheetPage({ params }: { params: { key: string } }) {
  const { key } = params
  const supabase = createServerComponentClient({ cookies })

  try {
    // First check if the public_links table exists
    const { data: tableExists, error: checkError } = await supabase
      .from("pg_tables")
      .select("tablename")
      .eq("tablename", "public_links")
      .eq("schemaname", "public")
      .maybeSingle()

    if (checkError || !tableExists) {
      console.error("Public links table doesn't exist:", checkError)
      notFound()
    }

    // Get the public link
    const { data: linkData, error: linkError } = await supabase
      .from("public_links")
      .select("*, sheets:sheet_id(id, name, data)")
      .eq("access_key", key)
      .eq("is_active", true)
      .single()

    if (linkError || !linkData || !linkData.sheets) {
      console.error("Error fetching public link:", linkError)
      notFound()
    }

    const sheetData = linkData.sheets.data || []
    const sheetName = linkData.sheets.name || "Sheet"

    return (
      <main className="min-h-screen bg-white">
        <PublicExcelSheet sheetData={sheetData} sheetName={sheetName} />
      </main>
    )
  } catch (error) {
    console.error("Error in public sheet page:", error)
    notFound()
  }
}
