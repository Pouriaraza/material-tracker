-- Update the get_sheet_data function to work with new constraint structure
CREATE OR REPLACE FUNCTION get_sheet_data(
    sheet_id_param UUID,
    user_id_param UUID
)
RETURNS JSON AS $$
DECLARE
    sheet_record RECORD;
    columns_data JSON;
    rows_data JSON;
    result JSON;
BEGIN
    -- Check if user has access to the sheet
    SELECT s.* INTO sheet_record
    FROM sheets s
    WHERE s.id = sheet_id_param
    AND (
        s.owner_id = user_id_param
        OR EXISTS (
            SELECT 1 FROM sheet_permissions sp
            WHERE sp.sheet_id = sheet_id_param
            AND sp.user_id = user_id_param
        )
    );

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Sheet not found or access denied');
    END IF;

    -- Get columns
    SELECT json_agg(
        json_build_object(
            'id', c.id,
            'name', c.name,
            'type', c.type,
            'position', c.position,
            'width', c.width,
            'is_required', c.is_required,
            'is_unique', c.is_unique,
            'default_value', c.default_value,
            'validation_rules', c.validation_rules,
            'format_options', c.format_options
        ) ORDER BY c.position
    ) INTO columns_data
    FROM columns c
    WHERE c.sheet_id = sheet_id_param;

    -- Get rows with cells (only non-deleted rows)
    SELECT json_agg(
        json_build_object(
            'id', r.id,
            'position', r.position,
            'is_deleted', r.is_deleted,
            'metadata', r.metadata,
            'created_at', r.created_at,
            'updated_at', r.updated_at,
            'cells', COALESCE(r.cells_data, '{}')
        ) ORDER BY r.position
    ) INTO rows_data
    FROM (
        SELECT 
            r.*,
            json_object_agg(
                COALESCE(c.column_id::text, ''), 
                c.value
            ) FILTER (WHERE c.column_id IS NOT NULL) as cells_data
        FROM rows r
        LEFT JOIN cells c ON r.id = c.row_id
        WHERE r.sheet_id = sheet_id_param
        AND r.is_deleted = false
        GROUP BY r.id, r.sheet_id, r.position, r.is_deleted, r.metadata, r.created_at, r.updated_at
    ) r;

    -- Build final result
    result := json_build_object(
        'sheet', row_to_json(sheet_record),
        'columns', COALESCE(columns_data, '[]'),
        'rows', COALESCE(rows_data, '[]')
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_sheet_data(UUID, UUID) TO authenticated;
