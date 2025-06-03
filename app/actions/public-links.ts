"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createPublicLink(sheetId: string) {
  const supabase = createClient()

  // Check if the user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Generate a unique access key
    const accessKey = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`

    // Check if the table exists
    const { error: checkError } = await supabase.from("public_links").select("id").limit(1)

    // If the table doesn't exist, we need to create it
    if (checkError && checkError.message && checkError.message.includes("does not exist")) {
      // Try to create the table using SQL
      // This will only work if the user has the necessary permissions
      // Otherwise, we'll need to handle this differently

      // For now, we'll return an error
      return {
        success: false,
        error: "The public_links table doesn't exist. Please contact an administrator to set it up.",
      }
    }

    // Check if a link already exists for this sheet
    const { data: existingLink, error: linkError } = await supabase
      .from("public_links")
      .select("id")
      .eq("sheet_id", sheetId)
      .maybeSingle()

    if (linkError && !linkError.message.includes("no rows")) {
      return { success: false, error: linkError.message }
    }

    if (existingLink) {
      // Update the existing link
      const { error: updateError } = await supabase
        .from("public_links")
        .update({
          access_key: accessKey,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingLink.id)

      if (updateError) {
        return { success: false, error: updateError.message }
      }
    } else {
      // Create a new link
      const { error: insertError } = await supabase.from("public_links").insert({
        sheet_id: sheetId,
        access_key: accessKey,
        created_by: user.id,
        is_active: true,
      })

      if (insertError) {
        return { success: false, error: insertError.message }
      }
    }

    revalidatePath(`/sheets/${sheetId}`)

    return {
      success: true,
      accessKey,
      publicLink: `/public/sheets/${accessKey}`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    }
  }
}

export async function togglePublicLink(sheetId: string, isActive: boolean) {
  const supabase = createClient()

  // Check if the user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const { error } = await supabase
      .from("public_links")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("sheet_id", sheetId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath(`/sheets/${sheetId}`)

    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    }
  }
}
