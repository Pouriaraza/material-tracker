-- Drop existing tables if they exist to avoid conflicts
DROP TABLE IF EXISTS public.user_invitations CASCADE;
DROP TABLE IF EXISTS public.admin_users CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table with all necessary fields
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "System can insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);

-- Create admin_users table
CREATE TABLE public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    UNIQUE(user_id)
);

-- Create index for admin_users
CREATE INDEX idx_admin_users_user_id ON public.admin_users(user_id);

-- Enable RLS for admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_users
DROP POLICY IF EXISTS "Anyone can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can manage admin users" ON public.admin_users;

CREATE POLICY "Anyone can view admin users" ON public.admin_users FOR SELECT USING (true);
CREATE POLICY "Admins can manage admin users" ON public.admin_users FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);

-- Create user_invitations table for managing invites
CREATE TABLE public.user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    invited_by UUID REFERENCES public.profiles(id),
    role TEXT DEFAULT 'user',
    is_admin BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending', -- pending, accepted, expired
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for user_invitations
CREATE INDEX idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX idx_user_invitations_status ON public.user_invitations(status);
CREATE INDEX idx_user_invitations_expires_at ON public.user_invitations(expires_at);

-- Enable RLS for user_invitations
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for user_invitations
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.user_invitations;
CREATE POLICY "Admins can manage invitations" ON public.user_invitations FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);

-- Function to sync auth.users to profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, first_name, last_name, last_sign_in_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        NEW.last_sign_in_at
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
        last_sign_in_at = EXCLUDED.last_sign_in_at,
        updated_at = NOW();
    
    -- Check if this user was invited as admin
    UPDATE public.user_invitations 
    SET status = 'accepted', accepted_at = NOW()
    WHERE email = NEW.email AND status = 'pending';
    
    -- If invited as admin, make them admin
    INSERT INTO public.admin_users (user_id, created_by)
    SELECT NEW.id, invited_by
    FROM public.user_invitations 
    WHERE email = NEW.email AND is_admin = true AND status = 'accepted'
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE admin_users.user_id = $1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user stats
CREATE OR REPLACE FUNCTION public.get_user_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM public.profiles),
        'active_users', (SELECT COUNT(*) FROM public.profiles WHERE is_active = true),
        'admin_users', (SELECT COUNT(*) FROM public.admin_users),
        'recent_signups', (SELECT COUNT(*) FROM public.profiles WHERE created_at > NOW() - INTERVAL '30 days'),
        'pending_invitations', (SELECT COUNT(*) FROM public.user_invitations WHERE status = 'pending')
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sync existing auth users to profiles (now that the table exists with all columns)
INSERT INTO public.profiles (id, email, full_name, first_name, last_name, last_sign_in_at)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', email),
    raw_user_meta_data->>'first_name',
    raw_user_meta_data->>'last_name',
    last_sign_in_at
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    last_sign_in_at = EXCLUDED.last_sign_in_at,
    updated_at = NOW();

-- Make the first user an admin if no admins exist
DO $$
DECLARE
    first_user_id UUID;
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM public.admin_users;
    
    IF admin_count = 0 THEN
        SELECT id INTO first_user_id FROM public.profiles ORDER BY created_at LIMIT 1;
        
        IF first_user_id IS NOT NULL THEN
            INSERT INTO public.admin_users (user_id) VALUES (first_user_id)
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
    END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.admin_users TO authenticated;
GRANT ALL ON public.user_invitations TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_stats() TO authenticated;
