-- Function to create material brands table
CREATE OR REPLACE FUNCTION public.create_material_brands_table()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create material brands table if it doesn't exist
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

  -- Create RLS policies
  DO $$
  BEGIN
    -- Drop existing policies if they exist
    BEGIN
      DROP POLICY IF EXISTS "Users can view all material brands" ON material_brands;
      DROP POLICY IF EXISTS "Users can insert material brands" ON material_brands;
      DROP POLICY IF EXISTS "Users can update their material brands" ON material_brands;
      DROP POLICY IF EXISTS "Users can delete their material brands" ON material_brands;
    EXCEPTION
      WHEN undefined_object THEN
        NULL;
    END;

    -- Create new policies
    CREATE POLICY "Users can view all material brands" ON material_brands FOR SELECT USING (true);
    CREATE POLICY "Users can insert material brands" ON material_brands FOR INSERT WITH CHECK (auth.uid() = created_by);
    CREATE POLICY "Users can update their material brands" ON material_brands FOR UPDATE USING (auth.uid() = created_by);
    CREATE POLICY "Users can delete their material brands" ON material_brands FOR DELETE USING (auth.uid() = created_by);
  END;
  $$;

  RETURN TRUE;
END;
$$;
