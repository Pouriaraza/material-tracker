-- Function to get table structure
CREATE OR REPLACE FUNCTION public.debug_get_table_structure(table_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'column_name', column_name,
    'data_type', data_type,
    'is_nullable', is_nullable
  ))
  INTO result
  FROM information_schema.columns
  WHERE table_name = debug_get_table_structure.table_name
  AND table_schema = 'public';
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Function to execute arbitrary SQL for debugging
CREATE OR REPLACE FUNCTION public.debug_execute_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sql_query || ') t' INTO result;
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Function to insert admin directly
CREATE OR REPLACE FUNCTION public.debug_insert_admin(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  result JSONB;
BEGIN
  -- Try to find the user in auth.users
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;
  
  IF user_id IS NULL THEN
    -- User doesn't exist
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  
  -- Try direct SQL insert
  BEGIN
    EXECUTE 'INSERT INTO public.user_roles (user_id, name, description) VALUES ($1, $2, $3)'
    USING user_id, 'admin', 'Administrator with full access';
    
    RETURN jsonb_build_object('success', true, 'message', 'Admin role assigned successfully');
  EXCEPTION
    WHEN OTHERS THEN
      -- If that fails, try to create the table first
      BEGIN
        EXECUTE '
          CREATE TABLE IF NOT EXISTS public.user_roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        ';
        
        -- Try insert again
        EXECUTE 'INSERT INTO public.user_roles (user_id, name, description) VALUES ($1, $2, $3)'
        USING user_id, 'admin', 'Administrator with full access';
        
        RETURN jsonb_build_object('success', true, 'message', 'Table created and admin role assigned successfully');
      EXCEPTION
        WHEN OTHERS THEN
          RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
      END;
  END;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.debug_get_table_structure(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_execute_sql(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_insert_admin(TEXT) TO authenticated;
