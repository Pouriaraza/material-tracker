-- Check if user_roles table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_roles'
  ) THEN
    CREATE TABLE public.user_roles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END
$$;

-- Insert default roles if they don't exist
INSERT INTO public.user_roles (name, description)
VALUES 
  ('viewer', 'Can only view content but not make changes')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.user_roles (name, description)
VALUES 
  ('editor', 'Can view and edit content')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.user_roles (name, description)
VALUES 
  ('admin', 'Can view, edit, and manage permissions')
ON CONFLICT (name) DO NOTHING;
