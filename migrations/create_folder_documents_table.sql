-- Create folder_documents table to track uploaded files
CREATE TABLE IF NOT EXISTS folder_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folder_id UUID NOT NULL REFERENCES site_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_folder_documents_folder_id ON folder_documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_documents_uploaded_by ON folder_documents(uploaded_by);
