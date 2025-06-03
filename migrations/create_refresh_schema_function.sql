-- Function to refresh schema cache
CREATE OR REPLACE FUNCTION refresh_schema_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- This is a no-op function that forces a schema refresh
  -- The actual refresh happens when the function is called via RPC
  RETURN;
END;
$$;

-- Function to insert material with all parameters
CREATE OR REPLACE FUNCTION insert_material(
  p_name TEXT,
  p_description TEXT,
  p_notes TEXT,
  p_part_number TEXT,
  p_category_id UUID,
  p_brand TEXT,
  p_quantity INT,
  p_unit TEXT,
  p_location TEXT,
  p_status TEXT,
  p_created_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
BEGIN
  INSERT INTO materials (
    name, 
    description, 
    notes, 
    part_number, 
    category_id, 
    brand, 
    quantity, 
    unit, 
    location, 
    status, 
    created_by
  )
  VALUES (
    p_name,
    p_description,
    p_notes,
    p_part_number,
    p_category_id,
    p_brand,
    p_quantity,
    p_unit,
    p_location,
    p_status,
    p_created_by
  )
  RETURNING to_jsonb(materials.*) INTO v_result;
  
  RETURN v_result;
END;
$$;
