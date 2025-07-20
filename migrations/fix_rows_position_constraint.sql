-- Drop the problematic unique constraint
ALTER TABLE IF EXISTS rows DROP CONSTRAINT IF EXISTS rows_sheet_id_position_key;

-- Create a partial unique index that only applies to non-deleted rows
CREATE UNIQUE INDEX IF NOT EXISTS rows_sheet_id_position_active_idx 
ON rows (sheet_id, position) 
WHERE is_deleted = false;

-- Create function to get next available position
CREATE OR REPLACE FUNCTION get_next_row_position(sheet_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    next_pos INTEGER;
BEGIN
    SELECT COALESCE(MAX(position), -1) + 1 
    INTO next_pos
    FROM rows 
    WHERE sheet_id = sheet_id_param 
    AND is_deleted = false;
    
    RETURN next_pos;
END;
$$ LANGUAGE plpgsql;

-- Create function to safely add a new row
CREATE OR REPLACE FUNCTION add_new_row_with_position(
    sheet_id_param UUID,
    user_id_param UUID
)
RETURNS TABLE(
    id UUID,
    sheet_id UUID,
    position INTEGER,
    is_deleted BOOLEAN,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
DECLARE
    new_position INTEGER;
    new_row_id UUID;
BEGIN
    -- Get next available position
    SELECT get_next_row_position(sheet_id_param) INTO new_position;
    
    -- Insert new row
    INSERT INTO rows (sheet_id, position, metadata, is_deleted)
    VALUES (
        sheet_id_param, 
        new_position, 
        jsonb_build_object('created_by', user_id_param),
        false
    )
    RETURNING rows.id INTO new_row_id;
    
    -- Return the new row
    RETURN QUERY
    SELECT r.id, r.sheet_id, r.position, r.is_deleted, r.metadata, r.created_at, r.updated_at
    FROM rows r
    WHERE r.id = new_row_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_next_row_position(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_new_row_with_position(UUID, UUID) TO authenticated;

-- Clean up any existing duplicate positions
WITH ranked_rows AS (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY sheet_id ORDER BY created_at) - 1 as new_position
    FROM rows 
    WHERE is_deleted = false
)
UPDATE rows 
SET position = ranked_rows.new_position
FROM ranked_rows 
WHERE rows.id = ranked_rows.id;
