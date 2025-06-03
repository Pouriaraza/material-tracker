import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Read the SQL file content (in a real app, you'd read from file system)
    const sqlCommands = [
      // Create material categories table
      `CREATE TABLE IF NOT EXISTS material_categories (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        brand VARCHAR(50) NOT NULL CHECK (brand IN ('ericsson', 'huawei')),
        color VARCHAR(7) DEFAULT '#3B82F6',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID REFERENCES auth.users(id),
        UNIQUE(name, brand)
      );`,

      // Create materials table
      `CREATE TABLE IF NOT EXISTS materials (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        notes TEXT,
        part_number VARCHAR(100),
        category_id UUID REFERENCES material_categories(id) ON DELETE CASCADE,
        brand VARCHAR(50) NOT NULL CHECK (brand IN ('ericsson', 'huawei')),
        quantity INTEGER DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'pcs',
        location VARCHAR(255),
        status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'out_of_stock', 'discontinued', 'reserved')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID REFERENCES auth.users(id)
      );`,

      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_material_categories_brand ON material_categories(brand);
       CREATE INDEX IF NOT EXISTS idx_materials_category_id ON materials(category_id);
       CREATE INDEX IF NOT EXISTS idx_materials_brand ON materials(brand);
       CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);`,

      // Enable RLS
      `ALTER TABLE material_categories ENABLE ROW LEVEL SECURITY;
       ALTER TABLE materials ENABLE ROW LEVEL SECURITY;`,

      // Create policies
      `DROP POLICY IF EXISTS "Users can view all material categories" ON material_categories;
       CREATE POLICY "Users can view all material categories" ON material_categories FOR SELECT USING (true);
       DROP POLICY IF EXISTS "Users can insert material categories" ON material_categories;
       CREATE POLICY "Users can insert material categories" ON material_categories FOR INSERT WITH CHECK (auth.uid() = created_by);`,

      `DROP POLICY IF EXISTS "Users can view all materials" ON materials;
       CREATE POLICY "Users can view all materials" ON materials FOR SELECT USING (true);
       DROP POLICY IF EXISTS "Users can insert materials" ON materials;
       CREATE POLICY "Users can insert materials" ON materials FOR INSERT WITH CHECK (auth.uid() = created_by);`,
    ]

    // Execute each SQL command
    for (const sql of sqlCommands) {
      const { error } = await supabase.rpc("execute_sql", {
        sql_query: sql,
      })
      if (error) {
        console.error("SQL Error:", error)
        throw error
      }
    }

    return NextResponse.json({
      success: true,
      message: "Material database setup completed successfully",
    })
  } catch (error) {
    console.error("Error setting up material database:", error)
    return NextResponse.json(
      {
        error: "Failed to setup material database",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
