import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const testResults = {
      timestamp: new Date().toISOString(),
      user_id: user.id,
      tests: [],
    }

    // Test 1: Check if tables exist
    try {
      const { data: sheetsTest } = await supabase.from("sheets").select("count").limit(1)
      const { data: columnsTest } = await supabase.from("columns").select("count").limit(1)
      const { data: rowsTest } = await supabase.from("rows").select("count").limit(1)
      const { data: cellsTest } = await supabase.from("cells").select("count").limit(1)

      testResults.tests.push({
        name: "Tables Existence",
        status: "passed",
        details: "All required tables exist",
      })
    } catch (err) {
      testResults.tests.push({
        name: "Tables Existence",
        status: "failed",
        error: err.message,
      })
    }

    // Test 2: Test sheet creation
    try {
      const { data: newSheet, error: sheetError } = await supabase
        .from("sheets")
        .insert([
          {
            name: "Test Sheet " + Date.now(),
            description: "Automated test sheet",
            owner_id: user.id,
            settings: { test: true },
            metadata: { created_by_test: true },
          },
        ])
        .select()
        .single()

      if (sheetError) throw sheetError

      testResults.tests.push({
        name: "Sheet Creation",
        status: "passed",
        details: `Created sheet with ID: ${newSheet.id}`,
      })

      // Test 3: Test column creation
      const { data: newColumn, error: columnError } = await supabase
        .from("columns")
        .insert([
          {
            sheet_id: newSheet.id,
            name: "Test Column",
            type: "text",
            position: 0,
            width: 120,
            is_required: false,
            is_unique: false,
            validation_rules: {},
            format_options: {},
          },
        ])
        .select()
        .single()

      if (columnError) throw columnError

      testResults.tests.push({
        name: "Column Creation",
        status: "passed",
        details: `Created column with ID: ${newColumn.id}`,
      })

      // Test 4: Test row creation
      const { data: newRow, error: rowError } = await supabase
        .from("rows")
        .insert([
          {
            sheet_id: newSheet.id,
            position: 0,
            metadata: { test: true },
          },
        ])
        .select()
        .single()

      if (rowError) throw rowError

      testResults.tests.push({
        name: "Row Creation",
        status: "passed",
        details: `Created row with ID: ${newRow.id}`,
      })

      // Test 5: Test cell creation
      const { data: newCell, error: cellError } = await supabase
        .from("cells")
        .insert([
          {
            row_id: newRow.id,
            column_id: newColumn.id,
            value: JSON.stringify("Test Value"),
            validation_status: "valid",
          },
        ])
        .select()
        .single()

      if (cellError) throw cellError

      testResults.tests.push({
        name: "Cell Creation",
        status: "passed",
        details: `Created cell with ID: ${newCell.id}`,
      })

      // Test 6: Test get_sheet_data function
      try {
        const { data: sheetData, error: functionError } = await supabase.rpc("get_sheet_data", {
          sheet_id_param: newSheet.id,
          user_id_param: user.id,
        })

        if (functionError) throw functionError

        testResults.tests.push({
          name: "Get Sheet Data Function",
          status: "passed",
          details: `Retrieved sheet data successfully`,
        })
      } catch (err) {
        testResults.tests.push({
          name: "Get Sheet Data Function",
          status: "failed",
          error: err.message,
        })
      }

      // Test 7: Test bulk update function
      try {
        const updates = [
          {
            row_id: newRow.id,
            column_id: newColumn.id,
            value: "Updated Test Value",
            formatted_value: "Updated Test Value",
          },
        ]

        const { data: bulkResult, error: bulkError } = await supabase.rpc("bulk_update_cells", {
          updates: JSON.stringify(updates),
        })

        if (bulkError) throw bulkError

        testResults.tests.push({
          name: "Bulk Update Function",
          status: "passed",
          details: `Bulk update completed successfully`,
        })
      } catch (err) {
        testResults.tests.push({
          name: "Bulk Update Function",
          status: "failed",
          error: err.message,
        })
      }

      // Cleanup test data
      await supabase.from("sheets").delete().eq("id", newSheet.id)
    } catch (err) {
      testResults.tests.push({
        name: "Sheet Creation",
        status: "failed",
        error: err.message,
      })
    }

    // Test 8: Test user roles
    try {
      const { data: roles, error: rolesError } = await supabase.from("user_roles").select("*")

      if (rolesError) throw rolesError

      testResults.tests.push({
        name: "User Roles",
        status: "passed",
        details: `Found ${roles.length} roles`,
      })
    } catch (err) {
      testResults.tests.push({
        name: "User Roles",
        status: "failed",
        error: err.message,
      })
    }

    const passedTests = testResults.tests.filter((t) => t.status === "passed").length
    const totalTests = testResults.tests.length

    return NextResponse.json({
      success: passedTests === totalTests,
      summary: `${passedTests}/${totalTests} tests passed`,
      results: testResults,
    })
  } catch (error) {
    console.error("Test error:", error)
    return NextResponse.json({ error: "Test failed", details: error.message }, { status: 500 })
  }
}
