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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_material_categories_brand ON material_categories(brand);
CREATE INDEX IF NOT EXISTS idx_material_categories_created_by ON material_categories(created_by);
CREATE INDEX IF NOT EXISTS idx_materials_category_id ON materials(category_id);
CREATE INDEX IF NOT EXISTS idx_materials_brand ON materials(brand);
CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);
CREATE INDEX IF NOT EXISTS idx_materials_created_by ON materials(created_by);
CREATE INDEX IF NOT EXISTS idx_materials_part_number ON materials(part_number);

-- Enable Row Level Security
ALTER TABLE material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for material_categories
DROP POLICY IF EXISTS "Users can view all material categories" ON material_categories;
DROP POLICY IF EXISTS "Users can insert material categories" ON material_categories;
DROP POLICY IF EXISTS "Users can update their material categories" ON material_categories;
DROP POLICY IF EXISTS "Users can delete their material categories" ON material_categories;

CREATE POLICY "Users can view all material categories" ON material_categories FOR SELECT USING (true);
CREATE POLICY "Users can insert material categories" ON material_categories FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their material categories" ON material_categories FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their material categories" ON material_categories FOR DELETE USING (auth.uid() = created_by);

-- Create RLS policies for materials
DROP POLICY IF EXISTS "Users can view all materials" ON materials;
DROP POLICY IF EXISTS "Users can insert materials" ON materials;
DROP POLICY IF EXISTS "Users can update their materials" ON materials;
DROP POLICY IF EXISTS "Users can delete their materials" ON materials;

CREATE POLICY "Users can view all materials" ON materials FOR SELECT USING (true);
CREATE POLICY "Users can insert materials" ON materials FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their materials" ON materials FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their materials" ON materials FOR DELETE USING (auth.uid() = created_by);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_material_categories_updated_at ON material_categories;
DROP TRIGGER IF EXISTS update_materials_updated_at ON materials;

CREATE TRIGGER update_material_categories_updated_at 
  BEFORE UPDATE ON material_categories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at 
  BEFORE UPDATE ON materials 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample categories for both brands
INSERT INTO material_categories (name, description, brand, color, created_by) VALUES
  ('Radio Equipment', 'Base stations, antennas, and radio units', 'ericsson', '#3B82F6', auth.uid()),
  ('Core Network', 'Core network equipment and components', 'ericsson', '#1E40AF', auth.uid()),
  ('Transmission', 'Transmission equipment and accessories', 'ericsson', '#1D4ED8', auth.uid()),
  ('Power Systems', 'Power supplies and backup systems', 'ericsson', '#2563EB', auth.uid()),
  ('Cables & Accessories', 'Cables, connectors, and accessories', 'ericsson', '#3730A3', auth.uid()),
  ('Spare Parts', 'Replacement parts and components', 'ericsson', '#4338CA', auth.uid()),
  
  ('Radio Equipment', 'Base stations, antennas, and radio units', 'huawei', '#DC2626', auth.uid()),
  ('Core Network', 'Core network equipment and components', 'huawei', '#B91C1C', auth.uid()),
  ('Transmission', 'Transmission equipment and accessories', 'huawei', '#991B1B', auth.uid()),
  ('Power Systems', 'Power supplies and backup systems', 'huawei', '#7F1D1D', auth.uid()),
  ('Cables & Accessories', 'Cables, connectors, and accessories', 'huawei', '#EF4444', auth.uid()),
  ('Spare Parts', 'Replacement parts and components', 'huawei', '#F87171', auth.uid())
ON CONFLICT (name, brand) DO NOTHING;

-- Create a view for easy material lookup with category info
CREATE OR REPLACE VIEW materials_with_categories AS
SELECT 
  m.*,
  mc.name as category_name,
  mc.color as category_color,
  mc.description as category_description
FROM materials m
LEFT JOIN material_categories mc ON m.category_id = mc.id;

-- Grant necessary permissions
GRANT ALL ON material_categories TO authenticated;
GRANT ALL ON materials TO authenticated;
GRANT SELECT ON materials_with_categories TO authenticated;
