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

    // Step 1: Create tables
    const createTablesSQL = `
      -- Create material categories table
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

      -- Create materials table
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

    // Step 2: Create indexes
    const createIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_material_categories_brand ON material_categories(brand);
      CREATE INDEX IF NOT EXISTS idx_material_categories_created_by ON material_categories(created_by);
      CREATE INDEX IF NOT EXISTS idx_materials_category_id ON materials(category_id);
      CREATE INDEX IF NOT EXISTS idx_materials_brand ON materials(brand);
      CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);
      CREATE INDEX IF NOT EXISTS idx_materials_created_by ON materials(created_by);
      CREATE INDEX IF NOT EXISTS idx_materials_part_number ON materials(part_number);
    `

    // Step 3: Enable RLS
    const enableRLSSQL = `
      ALTER TABLE material_categories ENABLE ROW LEVEL SECURITY;
      ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
    `

    // Step 4: Create RLS policies
    const createPoliciesSQL = `
      -- Drop existing policies
      DROP POLICY IF EXISTS "Users can view all material categories" ON material_categories;
      DROP POLICY IF EXISTS "Users can insert material categories" ON material_categories;
      DROP POLICY IF EXISTS "Users can update their material categories" ON material_categories;
      DROP POLICY IF EXISTS "Users can delete their material categories" ON material_categories;
      DROP POLICY IF EXISTS "Users can view all materials" ON materials;
      DROP POLICY IF EXISTS "Users can insert materials" ON materials;
      DROP POLICY IF EXISTS "Users can update their materials" ON materials;
      DROP POLICY IF EXISTS "Users can delete their materials" ON materials;

      -- Create new policies for categories
      CREATE POLICY "Users can view all material categories" ON material_categories FOR SELECT USING (true);
      CREATE POLICY "Users can insert material categories" ON material_categories FOR INSERT WITH CHECK (auth.uid() = created_by);
      CREATE POLICY "Users can update their material categories" ON material_categories FOR UPDATE USING (auth.uid() = created_by);
      CREATE POLICY "Users can delete their material categories" ON material_categories FOR DELETE USING (auth.uid() = created_by);

      -- Create new policies for materials
      CREATE POLICY "Users can view all materials" ON materials FOR SELECT USING (true);
      CREATE POLICY "Users can insert materials" ON materials FOR INSERT WITH CHECK (auth.uid() = created_by);
      CREATE POLICY "Users can update their materials" ON materials FOR UPDATE USING (auth.uid() = created_by);
      CREATE POLICY "Users can delete their materials" ON materials FOR DELETE USING (auth.uid() = created_by);
    `

    // Step 5: Create triggers
    const createTriggersSQL = `
      -- Create function to update updated_at timestamp
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Create triggers
      DROP TRIGGER IF EXISTS update_material_categories_updated_at ON material_categories;
      DROP TRIGGER IF EXISTS update_materials_updated_at ON materials;

      CREATE TRIGGER update_material_categories_updated_at 
        BEFORE UPDATE ON material_categories 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_materials_updated_at 
        BEFORE UPDATE ON materials 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `

    // Execute all setup SQL
    const { error: tablesError } = await supabase.rpc("execute_sql", {
      sql_query: createTablesSQL,
    })
    if (tablesError) throw new Error(`Tables creation failed: ${tablesError.message}`)

    const { error: indexesError } = await supabase.rpc("execute_sql", {
      sql_query: createIndexesSQL,
    })
    if (indexesError) throw new Error(`Indexes creation failed: ${indexesError.message}`)

    const { error: rlsError } = await supabase.rpc("execute_sql", {
      sql_query: enableRLSSQL,
    })
    if (rlsError) throw new Error(`RLS setup failed: ${rlsError.message}`)

    const { error: policiesError } = await supabase.rpc("execute_sql", {
      sql_query: createPoliciesSQL,
    })
    if (policiesError) throw new Error(`Policies creation failed: ${policiesError.message}`)

    const { error: triggersError } = await supabase.rpc("execute_sql", {
      sql_query: createTriggersSQL,
    })
    if (triggersError) throw new Error(`Triggers creation failed: ${triggersError.message}`)

    // Step 6: Insert sample categories for Ericsson
    const ericssonCategories = [
      {
        name: "Radio Equipment",
        description: "Base stations, antennas, and radio units",
        brand: "ericsson",
        color: "#3B82F6",
      },
      {
        name: "Core Network",
        description: "Core network equipment and components",
        brand: "ericsson",
        color: "#1E40AF",
      },
      {
        name: "Transmission",
        description: "Transmission equipment and accessories",
        brand: "ericsson",
        color: "#1D4ED8",
      },
      {
        name: "Power Systems",
        description: "Power supplies and backup systems",
        brand: "ericsson",
        color: "#2563EB",
      },
      {
        name: "Cables & Accessories",
        description: "Cables, connectors, and accessories",
        brand: "ericsson",
        color: "#3730A3",
      },
      {
        name: "Spare Parts",
        description: "Replacement parts and components",
        brand: "ericsson",
        color: "#4338CA",
      },
    ]

    // Step 7: Insert sample categories for Huawei
    const huaweiCategories = [
      {
        name: "Radio Equipment",
        description: "Base stations, antennas, and radio units",
        brand: "huawei",
        color: "#DC2626",
      },
      {
        name: "Core Network",
        description: "Core network equipment and components",
        brand: "huawei",
        color: "#B91C1C",
      },
      {
        name: "Transmission",
        description: "Transmission equipment and accessories",
        brand: "huawei",
        color: "#991B1B",
      },
      {
        name: "Power Systems",
        description: "Power supplies and backup systems",
        brand: "huawei",
        color: "#7F1D1D",
      },
      {
        name: "Cables & Accessories",
        description: "Cables, connectors, and accessories",
        brand: "huawei",
        color: "#EF4444",
      },
      {
        name: "Spare Parts",
        description: "Replacement parts and components",
        brand: "huawei",
        color: "#F87171",
      },
    ]

    // Insert categories
    const allCategories = [...ericssonCategories, ...huaweiCategories]
    const { data: insertedCategories, error: categoriesError } = await supabase
      .from("material_categories")
      .upsert(
        allCategories.map((cat) => ({
          ...cat,
          created_by: session.user.id,
        })),
        { onConflict: "name,brand" },
      )
      .select()

    if (categoriesError) throw new Error(`Categories insertion failed: ${categoriesError.message}`)

    // Step 8: Insert sample materials
    const sampleMaterials = []
    if (insertedCategories && insertedCategories.length > 0) {
      // Find categories by name and brand
      const findCategory = (name: string, brand: string) =>
        insertedCategories.find((cat) => cat.name === name && cat.brand === brand)

      // Ericsson Radio Equipment
      const ericssonRadio = findCategory("Radio Equipment", "ericsson")
      if (ericssonRadio) {
        sampleMaterials.push(
          {
            name: "AIR 3268 B41",
            description: "Massive MIMO Radio Unit for Band 41",
            notes: "High-performance radio unit with 64T64R configuration",
            part_number: "KRD 901 085/1",
            category_id: ericssonRadio.id,
            brand: "ericsson",
            quantity: 5,
            unit: "pcs",
            location: "Warehouse A-1",
            status: "available",
            created_by: session.user.id,
          },
          {
            name: "AIR 6449 B7",
            description: "Radio Unit for Band 7 (2600 MHz)",
            notes: "Compact radio unit for urban deployments",
            part_number: "KRD 901 086/1",
            category_id: ericssonRadio.id,
            brand: "ericsson",
            quantity: 12,
            unit: "pcs",
            location: "Warehouse A-2",
            status: "available",
            created_by: session.user.id,
          },
        )
      }

      // Ericsson Core Network
      const ericssonCore = findCategory("Core Network", "ericsson")
      if (ericssonCore) {
        sampleMaterials.push({
          name: "5G Core AMF",
          description: "Access and Mobility Management Function",
          notes: "Cloud-native 5G core network function",
          part_number: "ROJ 208 200/1",
          category_id: ericssonCore.id,
          brand: "ericsson",
          quantity: 2,
          unit: "licenses",
          location: "Data Center 1",
          status: "available",
          created_by: session.user.id,
        })
      }

      // Huawei Radio Equipment
      const huaweiRadio = findCategory("Radio Equipment", "huawei")
      if (huaweiRadio) {
        sampleMaterials.push(
          {
            name: "AAU5613",
            description: "Active Antenna Unit for 2.6GHz",
            notes: "64T64R Massive MIMO antenna unit",
            part_number: "02311LGT",
            category_id: huaweiRadio.id,
            brand: "huawei",
            quantity: 8,
            unit: "pcs",
            location: "Warehouse B-1",
            status: "available",
            created_by: session.user.id,
          },
          {
            name: "RRU5502W",
            description: "Remote Radio Unit for 1800MHz",
            notes: "High-efficiency radio unit for Band 3",
            part_number: "02311LGU",
            category_id: huaweiRadio.id,
            brand: "huawei",
            quantity: 15,
            unit: "pcs",
            location: "Warehouse B-2",
            status: "available",
            created_by: session.user.id,
          },
        )
      }

      // Huawei Core Network
      const huaweiCore = findCategory("Core Network", "huawei")
      if (huaweiCore) {
        sampleMaterials.push({
          name: "5G Core UPF",
          description: "User Plane Function",
          notes: "High-performance user plane processing",
          part_number: "02311LGV",
          category_id: huaweiCore.id,
          brand: "huawei",
          quantity: 3,
          unit: "licenses",
          location: "Data Center 2",
          status: "available",
          created_by: session.user.id,
        })
      }

      // Insert sample materials
      if (sampleMaterials.length > 0) {
        const { error: materialsError } = await supabase.from("materials").insert(sampleMaterials)
        if (materialsError) throw new Error(`Materials insertion failed: ${materialsError.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Material database created successfully with sample data",
      categoriesCount: insertedCategories?.length || 0,
      materialsCount: sampleMaterials?.length || 0,
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
