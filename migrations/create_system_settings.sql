-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  app_name VARCHAR(255) DEFAULT 'Tracker App',
  allow_signups BOOLEAN DEFAULT TRUE,
  require_email_verification BOOLEAN DEFAULT TRUE,
  max_file_size_mb INTEGER DEFAULT 10,
  default_items_per_page INTEGER DEFAULT 25,
  maintenance_mode BOOLEAN DEFAULT FALSE,
  maintenance_message TEXT DEFAULT 'The system is currently under maintenance. Please check back later.',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings if table is empty
INSERT INTO system_settings (app_name, allow_signups, require_email_verification)
SELECT 'Tracker App', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM system_settings);
