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

    // Create material categories table
    const createCategoriesTable = `
      CREATE TABLE IF NOT EXISTS material_categories (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        brand VARCHAR(50) NOT NULL CHECK (brand IN ('ericsson', 'huawei')),
        color VARCHAR(7) DEFAULT '#3B82F6',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID REFERENCES auth.users(id),
        UNIQUE(name, brand)
      );
    `

    // Create materials table
    const createMaterialsTable = `
      CREATE TABLE IF NOT EXISTS materials (
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
      );
    `

    // Create indexes
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_material_categories_brand ON material_categories(brand);
      CREATE INDEX IF NOT EXISTS idx_materials_category_id ON materials(category_id);
      CREATE INDEX IF NOT EXISTS idx_materials_brand ON materials(brand);
      CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);
    `

    // Enable RLS
    const enableRLS = `
      ALTER TABLE material_categories ENABLE ROW LEVEL SECURITY;
      ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
    `

    // Create RLS policies for categories
    const createCategoriesPolicies = `
      DROP POLICY IF EXISTS "Users can view all material categories" ON material_categories;
      DROP POLICY IF EXISTS "Users can insert material categories" ON material_categories;
      DROP POLICY IF EXISTS "Users can update their material categories" ON material_categories;
      DROP POLICY IF EXISTS "Users can delete their material categories" ON material_categories;

      CREATE POLICY "Users can view all material categories" ON material_categories FOR SELECT USING (true);
      CREATE POLICY "Users can insert material categories" ON material_categories FOR INSERT WITH CHECK (auth.uid() = created_by);
      CREATE POLICY "Users can update their material categories" ON material_categories FOR UPDATE USING (auth.uid() = created_by);
      CREATE POLICY "Users can delete their material categories" ON material_categories FOR DELETE USING (auth.uid() = created_by);
    `

    // Create RLS policies for materials
    const createMaterialsPolicies = `
      DROP POLICY IF EXISTS "Users can view all materials" ON materials;
      DROP POLICY IF EXISTS "Users can insert materials" ON materials;
      DROP POLICY IF EXISTS "Users can update their materials" ON materials;
      DROP POLICY IF EXISTS "Users can delete their materials" ON materials;

      CREATE POLICY "Users can view all materials" ON materials FOR SELECT USING (true);
      CREATE POLICY "Users can insert materials" ON materials FOR INSERT WITH CHECK (auth.uid() = created_by);
      CREATE POLICY "Users can update their materials" ON materials FOR UPDATE USING (auth.uid() = created_by);
      CREATE POLICY "Users can delete their materials" ON materials FOR DELETE USING (auth.uid() = created_by);
    `

    // Create update function
    const createUpdateFunction = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `

    // Create triggers
    const createTriggers = `
      DROP TRIGGER IF EXISTS update_material_categories_updated_at ON material_categories;
      DROP TRIGGER IF EXISTS update_materials_updated_at ON materials;

      CREATE TRIGGER update_material_categories_updated_at 
        BEFORE UPDATE ON material_categories 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_materials_updated_at 
        BEFORE UPDATE ON materials 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `

    // Execute all SQL commands
    const { error: categoriesError } = await supabase.rpc("execute_sql", {
      sql_query: createCategoriesTable,
    })
    if (categoriesError) throw categoriesError

    const { error: materialsError } = await supabase.rpc("execute_sql", {
      sql_query: createMaterialsTable,
    })
    if (materialsError) throw materialsError

    const { error: indexesError } = await supabase.rpc("execute_sql", {
      sql_query: createIndexes,
    })
    if (indexesError) throw indexesError

    const { error: rlsError } = await supabase.rpc("execute_sql", {
      sql_query: enableRLS,
    })
    if (rlsError) throw rlsError

    const { error: categoriesPoliciesError } = await supabase.rpc("execute_sql", {
      sql_query: createCategoriesPolicies,
    })
    if (categoriesPoliciesError) throw categoriesPoliciesError

    const { error: materialsPoliciesError } = await supabase.rpc("execute_sql", {
      sql_query: createMaterialsPolicies,
    })
    if (materialsPoliciesError) throw materialsPoliciesError

    const { error: functionError } = await supabase.rpc("execute_sql", {
      sql_query: createUpdateFunction,
    })
    if (functionError) throw functionError

    const { error: triggersError } = await supabase.rpc("execute_sql", {
      sql_query: createTriggers,
    })
    if (triggersError) throw triggersError

    return NextResponse.json({
      success: true,
      message: "Material tables created successfully",
    })
  } catch (error) {
    console.error("Error setting up material tables:", error)
    return NextResponse.json(
      {
        error: "Failed to setup material tables",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
