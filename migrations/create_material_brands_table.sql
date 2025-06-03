-- Create material brands table
CREATE TABLE IF NOT EXISTS material_brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_material_brands_slug ON material_brands(slug);
CREATE INDEX IF NOT EXISTS idx_material_brands_created_by ON material_brands(created_by);

-- Enable RLS
ALTER TABLE material_brands ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all material brands" ON material_brands;
DROP POLICY IF EXISTS "Users can insert material brands" ON material_brands;
DROP POLICY IF EXISTS "Users can update their material brands" ON material_brands;
DROP POLICY IF EXISTS "Users can delete their material brands" ON material_brands;

-- Create RLS policies
CREATE POLICY "Users can view all material brands" ON material_brands FOR SELECT USING (true);
CREATE POLICY "Users can insert material brands" ON material_brands FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their material brands" ON material_brands FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their material brands" ON material_brands FOR DELETE USING (auth.uid() = created_by);

-- Create update trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_material_brands_updated_at ON material_brands;
CREATE TRIGGER update_material_brands_updated_at 
  BEFORE UPDATE ON material_brands 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
