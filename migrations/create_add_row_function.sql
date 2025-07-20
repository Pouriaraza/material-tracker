-- Create comprehensive function to add row with cells
CREATE OR REPLACE FUNCTION add_row_with_cells(
    sheet_id_param UUID,
    user_id_param UUID
)
RETURNS JSON AS $$
DECLARE
    new_row_id UUID;
    new_position INTEGER;
    columns_record RECORD;
    result JSON;
BEGIN
    -- Get next available position
    SELECT COALESCE(MAX(position), -1) + 1 
    INTO new_position
    FROM rows 
    WHERE sheet_id = sheet_id_param 
    AND is_deleted = false;
    
    -- Insert new row
    INSERT INTO rows (sheet_id, position, metadata, is_deleted)
    VALUES (
        sheet_id_param, 
        new_position, 
        jsonb_build_object('created_by', user_id_param),
        false
    )
    RETURNING id INTO new_row_id;
    
    -- Insert default cells for all columns
    FOR columns_record IN 
        SELECT id, type, default_value 
        FROM columns 
        WHERE sheet_id = sheet_id_param 
        ORDER BY position
    LOOP
        INSERT INTO cells (row_id, column_id, value, validation_status)
        VALUES (
            new_row_id,
            columns_record.id,
            CASE 
                WHEN columns_record.default_value IS NOT NULL THEN columns_record.default_value
                WHEN columns_record.type = 'number' THEN '0'
                WHEN columns_record.type = 'checkbox' THEN 'false'
                WHEN columns_record.type = 'date' THEN to_char(CURRENT_DATE, 'YYYY-MM-DD')
                ELSE ''
            END,
            'valid'
        );
    END LOOP;
    
    -- Return the new row with cells
    SELECT json_build_object(
        'id', r.id,
        'sheet_id', r.sheet_id,
        'position', r.position,
        'is_deleted', r.is_deleted,
        'metadata', r.metadata,
        'created_at', r.created_at,
        'updated_at', r.updated_at,
        'cells', json_object_agg(
            c.column_id::text, 
            c.value
        )
    ) INTO result
    FROM rows r
    LEFT JOIN cells c ON r.id = c.row_id
    WHERE r.id = new_row_id
    GROUP BY r.id, r.sheet_id, r.position, r.is_deleted, r.metadata, r.created_at, r.updated_at;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_row_with_cells(UUID, UUID) TO authenticated;
