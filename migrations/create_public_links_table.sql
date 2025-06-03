-- Create the public_links table if it doesn't exist
CREATE TABLE IF NOT EXISTS public_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL,
  access_key TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_public_links_access_key ON public_links(access_key);
CREATE INDEX IF NOT EXISTS idx_public_links_sheet_id ON public_links(sheet_id);
