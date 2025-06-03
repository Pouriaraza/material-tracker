-- Function to create the public_links table if it doesn't exist
CREATE OR REPLACE FUNCTION create_public_links_table(sql_query TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_public_links_table(TEXT) TO authenticated;
