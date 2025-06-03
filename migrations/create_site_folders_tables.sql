-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create site_folders table
CREATE TABLE IF NOT EXISTS site_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  site_type TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create folder_permissions table
CREATE TABLE IF NOT EXISTS folder_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folder_id UUID NOT NULL REFERENCES site_folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  can_view BOOLEAN DEFAULT TRUE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(folder_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_site_folders_site_type ON site_folders(site_type);
CREATE INDEX IF NOT EXISTS idx_site_folders_created_by ON site_folders(created_by);
CREATE INDEX IF NOT EXISTS idx_folder_permissions_folder_id ON folder_permissions(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_permissions_user_id ON folder_permissions(user_id);
