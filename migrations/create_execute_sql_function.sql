-- Create a function to execute arbitrary SQL
CREATE OR REPLACE FUNCTION execute_sql(sql text) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE sql;
  RETURN '{"success": true}'::JSONB;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;
