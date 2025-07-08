import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createClient()

    // بررسی دسترسی کاربر
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const testResults = []

    // تست 1: ایجاد شیت جدید
    console.log("Testing sheet creation...")
    const { data: newSheet, error: sheetError } = await supabase
      .from("sheets")
      .insert([
        {
          name: "Test Sheet " + Date.now(),
          description: "Test sheet for new system",
          owner_id: user.id,
          settings: { theme: "default", auto_save: true },
          metadata: { created_by: user.id, test: true },
        },
      ])
      .select()
      .single()

    if (sheetError) {
      testResults.push({
        test: "Create Sheet",
        success: false,
        error: sheetError.message,
      })
    } else {
      testResults.push({
        test: "Create Sheet",
        success: true,
        data: { sheet_id: newSheet.id, name: newSheet.name },
      })

      // تست 2: ایجاد ستون‌های پیش‌فرض
      console.log("Testing column creation...")
      const defaultColumns = [
        { name: "Site ID", type: "text", position: 0 },
        { name: "Status", type: "select", position: 1, validation_rules: { options: ["Pending", "Done", "Problem"] } },
        { name: "Date", type: "date", position: 2 },
        { name: "Progress", type: "number", position: 3 },
        { name: "Active", type: "checkbox", position: 4 },
      ]

      const columnsToInsert = defaultColumns.map((col) => ({
        sheet_id: newSheet.id,
        ...col,
      }))

      const { data: columns, error: columnsError } = await supabase.from("columns").insert(columnsToInsert).select()

      if (columnsError) {
        testResults.push({
          test: "Create Columns",
          success: false,
          error: columnsError.message,
        })
      } else {
        testResults.push({
          test: "Create Columns",
          success: true,
          data: { columns_count: columns.length },
        })

        // تست 3: ایجاد سطرهای نمونه
        console.log("Testing row creation...")
        const sampleRows = Array.from({ length: 5 }, (_, i) => ({
          sheet_id: newSheet.id,
          position: i,
          metadata: { created_by: user.id, sample: true },
        }))

        const { data: rows, error: rowsError } = await supabase.from("rows").insert(sampleRows).select()

        if (rowsError) {
          testResults.push({
            test: "Create Rows",
            success: false,
            error: rowsError.message,
          })
        } else {
          testResults.push({
            test: "Create Rows",
            success: true,
            data: { rows_count: rows.length },
          })

          // تست 4: ایجاد سلول‌های نمونه
          console.log("Testing cell creation...")
          const sampleCells = []

          for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            for (let colIndex = 0; colIndex < columns.length; colIndex++) {
              const column = columns[colIndex]
              let sampleValue

              switch (column.type) {
                case "text":
                  sampleValue = `Site-${rowIndex + 1}-${colIndex + 1}`
                  break
                case "number":
                  sampleValue = Math.floor(Math.random() * 100)
                  break
                case "date":
                  sampleValue = new Date().toISOString().split("T")[0]
                  break
                case "checkbox":
                  sampleValue = Math.random() > 0.5
                  break
                case "select":
                  const options = ["Pending", "Done", "Problem"]
                  sampleValue = options[Math.floor(Math.random() * options.length)]
                  break
                default:
                  sampleValue = `Sample ${rowIndex}-${colIndex}`
              }

              sampleCells.push({
                row_id: rows[rowIndex].id,
                column_id: column.id,
                value: JSON.stringify(sampleValue),
                formatted_value: sampleValue.toString(),
                validation_status: "valid",
              })
            }
          }

          const { data: cells, error: cellsError } = await supabase.from("cells").insert(sampleCells).select()

          if (cellsError) {
            testResults.push({
              test: "Create Cells",
              success: false,
              error: cellsError.message,
            })
          } else {
            testResults.push({
              test: "Create Cells",
              success: true,
              data: { cells_count: cells.length },
            })

            // تست 5: دریافت داده‌های کامل شیت
            console.log("Testing get_sheet_data function...")
            const { data: sheetData, error: getDataError } = await supabase.rpc("get_sheet_data", {
              sheet_id_param: newSheet.id,
              user_id_param: user.id,
            })

            if (getDataError) {
              testResults.push({
                test: "Get Sheet Data",
                success: false,
                error: getDataError.message,
              })
            } else {
              testResults.push({
                test: "Get Sheet Data",
                success: true,
                data: {
                  has_sheet: !!sheetData.sheet,
                  columns_count: sheetData.columns?.length || 0,
                  rows_count: sheetData.rows?.length || 0,
                },
              })
            }

            // تست 6: به‌روزرسانی دسته‌ای سلول‌ها
            console.log("Testing bulk update...")
            const bulkUpdates = [
              {
                row_id: rows[0].id,
                column_id: columns[0].id,
                value: JSON.stringify("Updated Site ID"),
                formatted_value: "Updated Site ID",
              },
              {
                row_id: rows[1].id,
                column_id: columns[1].id,
                value: JSON.stringify("Done"),
                formatted_value: "Done",
              },
            ]

            const { data: bulkResult, error: bulkError } = await supabase.rpc("bulk_update_cells", {
              updates: JSON.stringify(bulkUpdates),
            })

            if (bulkError) {
              testResults.push({
                test: "Bulk Update Cells",
                success: false,
                error: bulkError.message,
              })
            } else {
              testResults.push({
                test: "Bulk Update Cells",
                success: true,
                data: bulkResult,
              })
            }

            // تست 7: جستجو در داده‌ها
            console.log("Testing search function...")
            const { data: searchResult, error: searchError } = await supabase.rpc("search_sheet_data", {
              sheet_id_param: newSheet.id,
              search_term: "Site",
              column_filters: JSON.stringify({}),
            })

            if (searchError) {
              testResults.push({
                test: "Search Sheet Data",
                success: false,
                error: searchError.message,
              })
            } else {
              testResults.push({
                test: "Search Sheet Data",
                success: true,
                data: { found_rows: searchResult?.length || 0 },
              })
            }

            // تست 8: آمار شیت
            console.log("Testing sheet stats...")
            const { data: stats, error: statsError } = await supabase
              .from("sheet_stats")
              .select("*")
              .eq("sheet_id", newSheet.id)
              .single()

            if (statsError) {
              testResults.push({
                test: "Sheet Stats",
                success: false,
                error: statsError.message,
              })
            } else {
              testResults.push({
                test: "Sheet Stats",
                success: true,
                data: {
                  column_count: stats.column_count,
                  row_count: stats.row_count,
                  cell_count: stats.cell_count,
                },
              })
            }

            // تست 9: ایجاد لینک عمومی
            console.log("Testing public link creation...")
            const accessKey = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 15)}`

            const { data: publicLink, error: linkError } = await supabase
              .from("public_links")
              .insert([
                {
                  sheet_id: newSheet.id,
                  access_key: accessKey,
                  created_by: user.id,
                  permissions: { can_view: true, can_edit: false, can_download: true },
                },
              ])
              .select()
              .single()

            if (linkError) {
              testResults.push({
                test: "Create Public Link",
                success: false,
                error: linkError.message,
              })
            } else {
              testResults.push({
                test: "Create Public Link",
                success: true,
                data: { access_key: publicLink.access_key },
              })
            }
          }
        }
      }
    }

    // خلاصه نتایج
    const successCount = testResults.filter((r) => r.success).length
    const totalTests = testResults.length
    const successRate = Math.round((successCount / totalTests) * 100)

    return NextResponse.json({
      success: true,
      message: `تست سیستم جدید شیت‌ها کامل شد`,
      summary: {
        total_tests: totalTests,
        successful_tests: successCount,
        failed_tests: totalTests - successCount,
        success_rate: `${successRate}%`,
      },
      detailed_results: testResults,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "خطا در تست سیستم",
      },
      { status: 500 },
    )
  }
}
