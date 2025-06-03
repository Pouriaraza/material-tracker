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
CREATE INDEX IF NOT EXISTS idx_materials_category_id ON materials(category_id);
CREATE INDEX IF NOT EXISTS idx_materials_brand ON materials(brand);
CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);

-- Enable RLS
ALTER TABLE material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all material categories" ON material_categories FOR SELECT USING (true);
CREATE POLICY "Users can insert material categories" ON material_categories FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their material categories" ON material_categories FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their material categories" ON material_categories FOR DELETE USING (auth.uid() = created_by);

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

-- Create triggers for updated_at
CREATE TRIGGER update_material_categories_updated_at BEFORE UPDATE ON material_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
