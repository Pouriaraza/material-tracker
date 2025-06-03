-- =====================================================
-- MANUAL MATERIAL DATABASE SETUP
-- Run this script in Supabase SQL Editor
-- =====================================================

-- Step 1: Create material_categories table
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

-- Step 2: Create materials table
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

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_material_categories_brand ON material_categories(brand);
CREATE INDEX IF NOT EXISTS idx_material_categories_created_by ON material_categories(created_by);
CREATE INDEX IF NOT EXISTS idx_materials_category_id ON materials(category_id);
CREATE INDEX IF NOT EXISTS idx_materials_brand ON materials(brand);
CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);
CREATE INDEX IF NOT EXISTS idx_materials_created_by ON materials(created_by);
CREATE INDEX IF NOT EXISTS idx_materials_part_number ON materials(part_number);

-- Step 4: Enable Row Level Security
ALTER TABLE material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for material_categories
DROP POLICY IF EXISTS "Users can view all material categories" ON material_categories;
DROP POLICY IF EXISTS "Users can insert material categories" ON material_categories;
DROP POLICY IF EXISTS "Users can update their material categories" ON material_categories;
DROP POLICY IF EXISTS "Users can delete their material categories" ON material_categories;

CREATE POLICY "Users can view all material categories" ON material_categories FOR SELECT USING (true);
CREATE POLICY "Users can insert material categories" ON material_categories FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their material categories" ON material_categories FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their material categories" ON material_categories FOR DELETE USING (auth.uid() = created_by);

-- Step 6: Create RLS policies for materials
DROP POLICY IF EXISTS "Users can view all materials" ON materials;
DROP POLICY IF EXISTS "Users can insert materials" ON materials;
DROP POLICY IF EXISTS "Users can update their materials" ON materials;
DROP POLICY IF EXISTS "Users can delete their materials" ON materials;

CREATE POLICY "Users can view all materials" ON materials FOR SELECT USING (true);
CREATE POLICY "Users can insert materials" ON materials FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their materials" ON materials FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their materials" ON materials FOR DELETE USING (auth.uid() = created_by);

-- Step 7: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 8: Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_material_categories_updated_at ON material_categories;
DROP TRIGGER IF EXISTS update_materials_updated_at ON materials;

CREATE TRIGGER update_material_categories_updated_at 
  BEFORE UPDATE ON material_categories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at 
  BEFORE UPDATE ON materials 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Insert sample categories for Ericsson
INSERT INTO material_categories (name, description, brand, color, created_by) VALUES
('Radio Equipment', 'Base stations, antennas, and radio units', 'ericsson', '#3B82F6', auth.uid()),
('Core Network', 'Core network equipment and components', 'ericsson', '#1E40AF', auth.uid()),
('Transmission', 'Transmission equipment and accessories', 'ericsson', '#1D4ED8', auth.uid()),
('Power Systems', 'Power supplies and backup systems', 'ericsson', '#2563EB', auth.uid()),
('Cables & Accessories', 'Cables, connectors, and accessories', 'ericsson', '#3730A3', auth.uid()),
('Spare Parts', 'Replacement parts and components', 'ericsson', '#4338CA', auth.uid())
ON CONFLICT (name, brand) DO NOTHING;

-- Step 10: Insert sample categories for Huawei
INSERT INTO material_categories (name, description, brand, color, created_by) VALUES
('Radio Equipment', 'Base stations, antennas, and radio units', 'huawei', '#DC2626', auth.uid()),
('Core Network', 'Core network equipment and components', 'huawei', '#B91C1C', auth.uid()),
('Transmission', 'Transmission equipment and accessories', 'huawei', '#991B1B', auth.uid()),
('Power Systems', 'Power supplies and backup systems', 'huawei', '#7F1D1D', auth.uid()),
('Cables & Accessories', 'Cables, connectors, and accessories', 'huawei', '#EF4444', auth.uid()),
('Spare Parts', 'Replacement parts and components', 'huawei', '#F87171', auth.uid())
ON CONFLICT (name, brand) DO NOTHING;

-- Step 11: Insert sample materials for Ericsson Radio Equipment
INSERT INTO materials (name, description, notes, part_number, category_id, brand, quantity, unit, location, status, created_by)
SELECT 
  'AIR 3268 B41',
  'Massive MIMO Radio Unit for Band 41',
  'High-performance radio unit with 64T64R configuration. Supports up to 200MHz bandwidth and advanced beamforming capabilities.',
  'KRD 901 085/1',
  mc.id,
  'ericsson',
  5,
  'pcs',
  'Warehouse A-1',
  'available',
  auth.uid()
FROM material_categories mc 
WHERE mc.name = 'Radio Equipment' AND mc.brand = 'ericsson';

INSERT INTO materials (name, description, notes, part_number, category_id, brand, quantity, unit, location, status, created_by)
SELECT 
  'AIR 6449 B7',
  'Radio Unit for Band 7 (2600 MHz)',
  'Compact radio unit for urban deployments. Supports 4x4 MIMO and carrier aggregation.',
  'KRD 901 086/1',
  mc.id,
  'ericsson',
  12,
  'pcs',
  'Warehouse A-2',
  'available',
  auth.uid()
FROM material_categories mc 
WHERE mc.name = 'Radio Equipment' AND mc.brand = 'ericsson';

INSERT INTO materials (name, description, notes, part_number, category_id, brand, quantity, unit, location, status, created_by)
SELECT 
  'RRUS 32 B2/B66',
  'Remote Radio Unit for Band 2/66',
  'Dual-band remote radio unit with high efficiency. Suitable for macro cell deployments.',
  'KRD 901 087/1',
  mc.id,
  'ericsson',
  8,
  'pcs',
  'Warehouse A-1',
  'available',
  auth.uid()
FROM material_categories mc 
WHERE mc.name = 'Radio Equipment' AND mc.brand = 'ericsson';

-- Step 12: Insert sample materials for Ericsson Core Network
INSERT INTO materials (name, description, notes, part_number, category_id, brand, quantity, unit, location, status, created_by)
SELECT 
  '5G Core AMF',
  'Access and Mobility Management Function',
  'Cloud-native 5G core network function for access and mobility management. Supports network slicing.',
  'ROJ 208 200/1',
  mc.id,
  'ericsson',
  2,
  'licenses',
  'Data Center 1',
  'available',
  auth.uid()
FROM material_categories mc 
WHERE mc.name = 'Core Network' AND mc.brand = 'ericsson';

INSERT INTO materials (name, description, notes, part_number, category_id, brand, quantity, unit, location, status, created_by)
SELECT 
  'HSS-FE',
  'Home Subscriber Server Front End',
  'High-capacity subscriber database for 4G/5G networks. Supports up to 100M subscribers.',
  'ROJ 208 201/1',
  mc.id,
  'ericsson',
  1,
  'server',
  'Data Center 1',
  'available',
  auth.uid()
FROM material_categories mc 
WHERE mc.name = 'Core Network' AND mc.brand = 'ericsson';

-- Step 13: Insert sample materials for Ericsson Power Systems
INSERT INTO materials (name, description, notes, part_number, category_id, brand, quantity, unit, location, status, created_by)
SELECT 
  'SMPS 48/3000 HE',
  'Switch Mode Power Supply 48V 3000W',
  'High-efficiency power supply module with hot-swap capability. 95% efficiency rating.',
  'BFD 101 999/1',
  mc.id,
  'ericsson',
  15,
  'pcs',
  'Warehouse A-3',
  'available',
  auth.uid()
FROM material_categories mc 
WHERE mc.name = 'Power Systems' AND mc.brand = 'ericsson';

-- Step 14: Insert sample materials for Huawei Radio Equipment
INSERT INTO materials (name, description, notes, part_number, category_id, brand, quantity, unit, location, status, created_by)
SELECT 
  'AAU5613',
  'Active Antenna Unit for 2.6GHz',
  '64T64R Massive MIMO antenna unit with integrated radio. Supports 200MHz bandwidth.',
  '02311LGT',
  mc.id,
  'huawei',
  8,
  'pcs',
  'Warehouse B-1',
  'available',
  auth.uid()
FROM material_categories mc 
WHERE mc.name = 'Radio Equipment' AND mc.brand = 'huawei';

INSERT INTO materials (name, description, notes, part_number, category_id, brand, quantity, unit, location, status, created_by)
SELECT 
  'RRU5502W',
  'Remote Radio Unit for 1800MHz',
  'High-efficiency radio unit for Band 3. Supports 4x4 MIMO and 20MHz bandwidth.',
  '02311LGU',
  mc.id,
  'huawei',
  15,
  'pcs',
  'Warehouse B-2',
  'available',
  auth.uid()
FROM material_categories mc 
WHERE mc.name = 'Radio Equipment' AND mc.brand = 'huawei';

INSERT INTO materials (name, description, notes, part_number, category_id, brand, quantity, unit, location, status, created_by)
SELECT 
  'AAU5940',
  'Active Antenna Unit for 3.5GHz',
  '32T32R antenna unit for 5G NR Band n78. Optimized for urban coverage.',
  '02311LGV',
  mc.id,
  'huawei',
  6,
  'pcs',
  'Warehouse B-1',
  'available',
  auth.uid()
FROM material_categories mc 
WHERE mc.name = 'Radio Equipment' AND mc.brand = 'huawei';

-- Step 15: Insert sample materials for Huawei Core Network
INSERT INTO materials (name, description, notes, part_number, category_id, brand, quantity, unit, location, status, created_by)
SELECT 
  '5G Core UPF',
  'User Plane Function',
  'High-performance user plane processing for 5G networks. Supports network slicing and edge computing.',
  '02311LGW',
  mc.id,
  'huawei',
  3,
  'licenses',
  'Data Center 2',
  'available',
  auth.uid()
FROM material_categories mc 
WHERE mc.name = 'Core Network' AND mc.brand = 'huawei';

INSERT INTO materials (name, description, notes, part_number, category_id, brand, quantity, unit, location, status, created_by)
SELECT 
  'HSS9860',
  'Home Subscriber Server',
  'Carrier-grade HSS supporting both 4G and 5G subscribers. Capacity up to 500M users.',
  '02311LGX',
  mc.id,
  'huawei',
  1,
  'server',
  'Data Center 2',
  'available',
  auth.uid()
FROM material_categories mc 
WHERE mc.name = 'Core Network' AND mc.brand = 'huawei';

-- Step 16: Insert sample materials for Huawei Power Systems
INSERT INTO materials (name, description, notes, part_number, category_id, brand, quantity, unit, location, status, created_by)
SELECT 
  'TP48300A-HU15A6',
  'Telecom Power System 48V 300A',
  'Modular power system with N+1 redundancy. Supports hot-swap modules and remote monitoring.',
  '02311LGY',
  mc.id,
  'huawei',
  4,
  'systems',
  'Warehouse B-3',
  'available',
  auth.uid()
FROM material_categories mc 
WHERE mc.name = 'Power Systems' AND mc.brand = 'huawei';

-- Step 17: Insert some cables and accessories
INSERT INTO materials (name, description, notes, part_number, category_id, brand, quantity, unit, location, status, created_by)
SELECT 
  'AISG Cable 10m',
  'Antenna Interface Standards Group Cable',
  'Weather-resistant AISG cable for antenna connections. RET compatible.',
  'KDU 137 999/1',
  mc.id,
  'ericsson',
  50,
  'pcs',
  'Warehouse A-4',
  'available',
  auth.uid()
FROM material_categories mc 
WHERE mc.name = 'Cables & Accessories' AND mc.brand = 'ericsson';

INSERT INTO materials (name, description, notes, part_number, category_id, brand, quantity, unit, location, status, created_by)
SELECT 
  'Fiber Optic Cable SM 24F',
  'Single Mode Fiber Cable 24 Fibers',
  'Outdoor-rated fiber optic cable for fronthaul connections. ADSS type.',
  '02311LGZ',
  mc.id,
  'huawei',
  1000,
  'meters',
  'Warehouse B-4',
  'available',
  auth.uid()
FROM material_categories mc 
WHERE mc.name = 'Cables & Accessories' AND mc.brand = 'huawei';

-- Step 18: Insert some spare parts
INSERT INTO materials (name, description, notes, part_number, category_id, brand, quantity, unit, location, status, created_by)
SELECT 
  'Fan Module FRU',
  'Field Replaceable Unit - Cooling Fan',
  'Replacement fan module for baseband units. Hot-swappable design.',
  'KDU 137 888/1',
  mc.id,
  'ericsson',
  25,
  'pcs',
  'Warehouse A-5',
  'available',
  auth.uid()
FROM material_categories mc 
WHERE mc.name = 'Spare Parts' AND mc.brand = 'ericsson';

INSERT INTO materials (name, description, notes, part_number, category_id, brand, quantity, unit, location, status, created_by)
SELECT 
  'Power Module 3000W',
  'Replacement Power Module',
  'Hot-swappable power module for BBU series. 3000W capacity with 95% efficiency.',
  '02311LHA',
  mc.id,
  'huawei',
  10,
  'pcs',
  'Warehouse B-5',
  'available',
  auth.uid()
FROM material_categories mc 
WHERE mc.name = 'Spare Parts' AND mc.brand = 'huawei';

-- Step 19: Add some items with different statuses for testing
INSERT INTO materials (name, description, notes, part_number, category_id, brand, quantity, unit, location, status, created_by)
SELECT 
  'AIR 3268 B41 (Reserved)',
  'Massive MIMO Radio Unit for Band 41',
  'Reserved for Project Alpha deployment. Do not use for other projects.',
  'KRD 901 085/2',
  mc.id,
  'ericsson',
  3,
  'pcs',
  'Warehouse A-1',
  'reserved',
  auth.uid()
FROM material_categories mc 
WHERE mc.name = 'Radio Equipment' AND mc.brand = 'ericsson';

INSERT INTO materials (name, description, notes, part_number, category_id, brand, quantity, unit, location, status, created_by)
SELECT 
  'Legacy RBS 6000',
  'Legacy Base Station (Discontinued)',
  'End-of-life product. No longer supported. Use for spare parts only.',
  'KRD 901 001/1',
  mc.id,
  'ericsson',
  2,
  'pcs',
  'Warehouse A-6',
  'discontinued',
  auth.uid()
FROM material_categories mc 
WHERE mc.name = 'Radio Equipment' AND mc.brand = 'ericsson';

-- Final step: Display summary
DO $$
DECLARE
    category_count INTEGER;
    material_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count FROM material_categories;
    SELECT COUNT(*) INTO material_count FROM materials;
    
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'MATERIAL DATABASE SETUP COMPLETED!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Categories created: %', category_count;
    RAISE NOTICE 'Materials created: %', material_count;
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'You can now use the Material Management System';
    RAISE NOTICE 'Visit: /material/ericsson or /material/huawei';
    RAISE NOTICE '==============================================';
END $$;
