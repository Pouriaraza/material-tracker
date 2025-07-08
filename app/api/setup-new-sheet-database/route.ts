import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"

export async function POST() {
  try {
    const supabase = createClient()

    // بررسی دسترسی admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // خواندن فایل SQL
    const sqlPath = join(process.cwd(), "migrations", "create_new_sheet_database.sql")
    const sqlContent = readFileSync(sqlPath, "utf8")

    // تقسیم SQL به دستورات جداگانه
    const sqlStatements = sqlContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"))

    const results = []
    let successCount = 0
    let errorCount = 0

    // اجرای هر دستور SQL
    for (const statement of sqlStatements) {
      try {
        const { data, error } = await supabase.rpc("execute_sql", {
          sql_query: statement,
        })

        if (error) {
          console.error("SQL Error:", error)
          results.push({
            statement: statement.substring(0, 100) + "...",
            success: false,
            error: error.message,
          })
          errorCount++
        } else {
          results.push({
            statement: statement.substring(0, 100) + "...",
            success: true,
            data,
          })
          successCount++
        }
      } catch (err: any) {
        console.error("Execution Error:", err)
        results.push({
          statement: statement.substring(0, 100) + "...",
          success: false,
          error: err.message,
        })
        errorCount++
      }
    }

    // ثبت لاگ عملیات
    await supabase.from("admin_logs").insert({
      user_id: user.id,
      action: "setup_new_sheet_database",
      details: {
        total_statements: sqlStatements.length,
        success_count: successCount,
        error_count: errorCount,
        timestamp: new Date().toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      message: "دیتابیس جدید شیت‌ها با موفقیت ایجاد شد",
      stats: {
        total_statements: sqlStatements.length,
        success_count: successCount,
        error_count: errorCount,
      },
      results,
    })
  } catch (error: any) {
    console.error("Setup error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "خطا در ایجاد دیتابیس",
      },
      { status: 500 },
    )
  }
}
