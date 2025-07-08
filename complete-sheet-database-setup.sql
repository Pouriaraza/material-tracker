-- حذف جداول قدیمی اگر وجود دارند
DROP TABLE IF EXISTS cells CASCADE;
DROP TABLE IF EXISTS rows CASCADE;
DROP TABLE IF EXISTS columns CASCADE;
DROP TABLE IF EXISTS sheet_permissions CASCADE;
DROP TABLE IF EXISTS public_links CASCADE;
DROP TABLE IF EXISTS sheets CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS sheet_history CASCADE;

-- ایجاد جدول نقش‌های کاربری
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ایجاد جدول اصلی شیت‌ها
CREATE TABLE sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ایجاد جدول ستون‌ها
CREATE TABLE columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('text', 'number', 'date', 'checkbox', 'select', 'email', 'url')),
    position INTEGER NOT NULL DEFAULT 0,
    width INTEGER DEFAULT 120,
    is_required BOOLEAN DEFAULT false,
    is_unique BOOLEAN DEFAULT false,
    default_value TEXT,
    validation_rules JSONB DEFAULT '{}',
    format_options JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sheet_id, position)
);

-- ایجاد جدول سطرها
CREATE TABLE rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sheet_id, position)
);

-- ایجاد جدول سلول‌ها
CREATE TABLE cells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    row_id UUID NOT NULL REFERENCES rows(id) ON DELETE CASCADE,
    column_id UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    value JSONB,
    formatted_value TEXT,
    validation_status VARCHAR(20) DEFAULT 'valid' CHECK (validation_status IN ('valid', 'invalid', 'warning')),
    validation_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(row_id, column_id)
);

-- ایجاد جدول مجوزهای شیت
CREATE TABLE sheet_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sheet_id, user_id)
);

-- ایجاد جدول لینک‌های عمومی
CREATE TABLE public_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
    access_key VARCHAR(100) UNIQUE NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    max_access_count INTEGER,
    permissions JSONB DEFAULT '{"can_view": true, "can_edit": false, "can_download": false}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ایجاد جدول تاریخچه تغییرات
CREATE TABLE sheet_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}',
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ایجاد ایندکس‌های بهینه
CREATE INDEX idx_sheets_owner_id ON sheets(owner_id);
CREATE INDEX idx_sheets_created_at ON sheets(created_at DESC);
CREATE INDEX idx_sheets_is_active ON sheets(is_active);

CREATE INDEX idx_columns_sheet_id ON columns(sheet_id);
CREATE INDEX idx_columns_position ON columns(sheet_id, position);
CREATE INDEX idx_columns_type ON columns(type);

CREATE INDEX idx_rows_sheet_id ON rows(sheet_id);
CREATE INDEX idx_rows_position ON rows(sheet_id, position);
CREATE INDEX idx_rows_is_deleted ON rows(is_deleted);

CREATE INDEX idx_cells_row_id ON cells(row_id);
CREATE INDEX idx_cells_column_id ON cells(column_id);
CREATE INDEX idx_cells_value ON cells USING GIN(value);
CREATE INDEX idx_cells_updated_at ON cells(updated_at DESC);

CREATE INDEX idx_sheet_permissions_sheet_id ON sheet_permissions(sheet_id);
CREATE INDEX idx_sheet_permissions_user_id ON sheet_permissions(user_id);
CREATE INDEX idx_sheet_permissions_is_active ON sheet_permissions(is_active);

CREATE INDEX idx_public_links_access_key ON public_links(access_key);
CREATE INDEX idx_public_links_sheet_id ON public_links(sheet_id);
CREATE INDEX idx_public_links_is_active ON public_links(is_active);

CREATE INDEX idx_sheet_history_sheet_id ON sheet_history(sheet_id);
CREATE INDEX idx_sheet_history_user_id ON sheet_history(user_id);
CREATE INDEX idx_sheet_history_created_at ON sheet_history(created_at DESC);

-- ایجاد trigger برای به‌روزرسانی خودکار updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sheets_updated_at BEFORE UPDATE ON sheets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_columns_updated_at BEFORE UPDATE ON columns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rows_updated_at BEFORE UPDATE ON rows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cells_updated_at BEFORE UPDATE ON cells
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sheet_permissions_updated_at BEFORE UPDATE ON sheet_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_public_links_updated_at BEFORE UPDATE ON public_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- درج نقش‌های پیش‌فرض
INSERT INTO user_roles (name, description, permissions) VALUES
('owner', 'مالک شیت - دسترسی کامل', '{"can_view": true, "can_edit": true, "can_delete": true, "can_share": true, "can_manage_permissions": true}'),
('admin', 'مدیر - دسترسی کامل به جز حذف', '{"can_view": true, "can_edit": true, "can_delete": false, "can_share": true, "can_manage_permissions": true}'),
('editor', 'ویرایشگر - می‌تواند مشاهده و ویرایش کند', '{"can_view": true, "can_edit": true, "can_delete": false, "can_share": false, "can_manage_permissions": false}'),
('viewer', 'بیننده - فقط مشاهده', '{"can_view": true, "can_edit": false, "can_delete": false, "can_share": false, "can_manage_permissions": false}');

-- ایجاد تابع برای دریافت بهینه داده‌های شیت
CREATE OR REPLACE FUNCTION get_sheet_data(sheet_id_param UUID, user_id_param UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    has_access BOOLEAN := false;
BEGIN
    -- بررسی دسترسی کاربر
    SELECT EXISTS(
        SELECT 1 FROM sheets s 
        WHERE s.id = sheet_id_param 
        AND (s.owner_id = user_id_param 
             OR EXISTS(
                 SELECT 1 FROM sheet_permissions sp 
                 WHERE sp.sheet_id = sheet_id_param 
                 AND sp.user_id = user_id_param 
                 AND sp.is_active = true
             ))
    ) INTO has_access;
    
    IF NOT has_access THEN
        RETURN '{"error": "Access denied"}'::JSON;
    END IF;
    
    -- دریافت داده‌های کامل شیت
    SELECT json_build_object(
        'sheet', (
            SELECT row_to_json(s) FROM (
                SELECT id, name, description, owner_id, is_active, settings, metadata, created_at, updated_at
                FROM sheets WHERE id = sheet_id_param
            ) s
        ),
        'columns', (
            SELECT COALESCE(json_agg(
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
            ), '[]'::json)
            FROM columns c WHERE c.sheet_id = sheet_id_param
        ),
        'rows', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', r.id,
                    'position', r.position,
                    'metadata', r.metadata,
                    'cells', r.cells
                ) ORDER BY r.position
            ), '[]'::json)
            FROM (
                SELECT 
                    r.id,
                    r.position,
                    r.metadata,
                    COALESCE(
                        json_object_agg(
                            c.column_id, 
                            json_build_object(
                                'value', c.value,
                                'formatted_value', c.formatted_value,
                                'validation_status', c.validation_status,
                                'validation_message', c.validation_message
                            )
                        ) FILTER (WHERE c.column_id IS NOT NULL),
                        '{}'::json
                    ) as cells
                FROM rows r
                LEFT JOIN cells c ON r.id = c.row_id
                WHERE r.sheet_id = sheet_id_param AND r.is_deleted = false
                GROUP BY r.id, r.position, r.metadata
            ) r
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ایجاد تابع برای به‌روزرسانی دسته‌ای سلول‌ها
CREATE OR REPLACE FUNCTION bulk_update_cells(updates JSON)
RETURNS JSON AS $$
DECLARE
    update_item JSON;
    affected_rows INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    FOR update_item IN SELECT * FROM json_array_elements(updates)
    LOOP
        BEGIN
            INSERT INTO cells (row_id, column_id, value, formatted_value)
            VALUES (
                (update_item->>'row_id')::UUID,
                (update_item->>'column_id')::UUID,
                (update_item->>'value')::JSON,
                update_item->>'formatted_value'
            )
            ON CONFLICT (row_id, column_id) 
            DO UPDATE SET 
                value = EXCLUDED.value,
                formatted_value = EXCLUDED.formatted_value,
                updated_at = NOW();
            
            affected_rows := affected_rows + 1;
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
        END;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'affected_rows', affected_rows,
        'error_count', error_count
    );
END;
$$ LANGUAGE plpgsql;

-- ایجاد تابع برای جستجوی بهینه
CREATE OR REPLACE FUNCTION search_sheet_data(
    sheet_id_param UUID,
    search_term TEXT,
    column_filters JSON DEFAULT '{}'::JSON
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    where_clause TEXT := '';
    filter_key TEXT;
    filter_value TEXT;
BEGIN
    -- ساخت شرط جستجو
    IF search_term IS NOT NULL AND search_term != '' THEN
        where_clause := where_clause || ' AND (c.formatted_value ILIKE ''%' || search_term || '%'' OR c.value::text ILIKE ''%' || search_term || '%'')';
    END IF;
    
    -- اضافه کردن فیلترهای ستون
    FOR filter_key, filter_value IN SELECT * FROM json_each_text(column_filters)
    LOOP
        IF filter_value IS NOT NULL AND filter_value != '' THEN
            where_clause := where_clause || ' AND col.id = ''' || filter_key || ''' AND (c.formatted_value ILIKE ''%' || filter_value || '%'' OR c.value::text ILIKE ''%' || filter_value || '%'')';
        END IF;
    END LOOP;
    
    -- اجرای کوئری جستجو
    EXECUTE 'SELECT COALESCE(json_agg(DISTINCT r.id), ''[]''::json) FROM rows r 
             JOIN cells c ON r.id = c.row_id 
             JOIN columns col ON c.column_id = col.id 
             WHERE r.sheet_id = $1 AND r.is_deleted = false' || where_clause
    INTO result
    USING sheet_id_param;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ایجاد view برای آمار شیت‌ها
CREATE VIEW sheet_stats AS
SELECT 
    s.id as sheet_id,
    s.name as sheet_name,
    s.owner_id,
    COUNT(DISTINCT c.id) as column_count,
    COUNT(DISTINCT r.id) as row_count,
    COUNT(DISTINCT cells.id) as cell_count,
    COUNT(DISTINCT sp.user_id) as shared_users_count,
    s.created_at,
    s.updated_at,
    MAX(cells.updated_at) as last_modified
FROM sheets s
LEFT JOIN columns c ON s.id = c.sheet_id
LEFT JOIN rows r ON s.id = r.sheet_id AND r.is_deleted = false
LEFT JOIN cells ON r.id = cells.row_id
LEFT JOIN sheet_permissions sp ON s.id = sp.sheet_id AND sp.is_active = true
WHERE s.is_active = true
GROUP BY s.id, s.name, s.owner_id, s.created_at, s.updated_at;

-- ایجاد تابع برای پاک‌سازی داده‌های قدیمی
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- حذف تاریخچه قدیمی‌تر از 6 ماه
    DELETE FROM sheet_history 
    WHERE created_at < NOW() - INTERVAL '6 months';
    
    -- حذف لینک‌های منقضی شده
    UPDATE public_links 
    SET is_active = false 
    WHERE expires_at < NOW() AND is_active = true;
    
    -- حذف مجوزهای منقضی شده
    UPDATE sheet_permissions 
    SET is_active = false 
    WHERE expires_at < NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- تنظیم RLS (Row Level Security)
ALTER TABLE sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_permissions ENABLE ROW LEVEL SECURITY;

-- ایجاد policy برای sheets
CREATE POLICY "Users can view their own sheets" ON sheets
    FOR SELECT USING (
        owner_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM sheet_permissions sp 
            WHERE sp.sheet_id = sheets.id 
            AND sp.user_id = auth.uid() 
            AND sp.is_active = true
        )
    );

CREATE POLICY "Users can create their own sheets" ON sheets
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own sheets" ON sheets
    FOR UPDATE USING (
        owner_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM sheet_permissions sp 
            JOIN user_roles ur ON sp.role_id = ur.id
            WHERE sp.sheet_id = sheets.id 
            AND sp.user_id = auth.uid() 
            AND sp.is_active = true
            AND (ur.permissions->>'can_edit')::boolean = true
        )
    );

CREATE POLICY "Users can delete their own sheets" ON sheets
    FOR DELETE USING (owner_id = auth.uid());

-- ایجاد policy برای columns
CREATE POLICY "Users can view columns of accessible sheets" ON columns
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sheets s 
            WHERE s.id = columns.sheet_id 
            AND (s.owner_id = auth.uid() OR 
                 EXISTS (
                     SELECT 1 FROM sheet_permissions sp 
                     WHERE sp.sheet_id = s.id 
                     AND sp.user_id = auth.uid() 
                     AND sp.is_active = true
                 ))
        )
    );

CREATE POLICY "Users can manage columns of their sheets" ON columns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sheets s 
            WHERE s.id = columns.sheet_id 
            AND (s.owner_id = auth.uid() OR 
                 EXISTS (
                     SELECT 1 FROM sheet_permissions sp 
                     JOIN user_roles ur ON sp.role_id = ur.id
                     WHERE sp.sheet_id = s.id 
                     AND sp.user_id = auth.uid() 
                     AND sp.is_active = true
                     AND (ur.permissions->>'can_edit')::boolean = true
                 ))
        )
    );

-- ایجاد policy برای rows
CREATE POLICY "Users can view rows of accessible sheets" ON rows
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sheets s 
            WHERE s.id = rows.sheet_id 
            AND (s.owner_id = auth.uid() OR 
                 EXISTS (
                     SELECT 1 FROM sheet_permissions sp 
                     WHERE sp.sheet_id = s.id 
                     AND sp.user_id = auth.uid() 
                     AND sp.is_active = true
                 ))
        )
    );

CREATE POLICY "Users can manage rows of editable sheets" ON rows
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sheets s 
            WHERE s.id = rows.sheet_id 
            AND (s.owner_id = auth.uid() OR 
                 EXISTS (
                     SELECT 1 FROM sheet_permissions sp 
                     JOIN user_roles ur ON sp.role_id = ur.id
                     WHERE sp.sheet_id = s.id 
                     AND sp.user_id = auth.uid() 
                     AND sp.is_active = true
                     AND (ur.permissions->>'can_edit')::boolean = true
                 ))
        )
    );

-- ایجاد policy برای cells
CREATE POLICY "Users can view cells of accessible sheets" ON cells
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM rows r 
            JOIN sheets s ON r.sheet_id = s.id
            WHERE r.id = cells.row_id 
            AND (s.owner_id = auth.uid() OR 
                 EXISTS (
                     SELECT 1 FROM sheet_permissions sp 
                     WHERE sp.sheet_id = s.id 
                     AND sp.user_id = auth.uid() 
                     AND sp.is_active = true
                 ))
        )
    );

CREATE POLICY "Users can manage cells of editable sheets" ON cells
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rows r 
            JOIN sheets s ON r.sheet_id = s.id
            WHERE r.id = cells.row_id 
            AND (s.owner_id = auth.uid() OR 
                 EXISTS (
                     SELECT 1 FROM sheet_permissions sp 
                     JOIN user_roles ur ON sp.role_id = ur.id
                     WHERE sp.sheet_id = s.id 
                     AND sp.user_id = auth.uid() 
                     AND sp.is_active = true
                     AND (ur.permissions->>'can_edit')::boolean = true
                 ))
        )
    );

-- کامنت‌ها برای مستندسازی
COMMENT ON TABLE sheets IS 'جدول اصلی شیت‌های اکسل';
COMMENT ON TABLE columns IS 'ستون‌های هر شیت';
COMMENT ON TABLE rows IS 'سطرهای هر شیت';
COMMENT ON TABLE cells IS 'سلول‌های داده';
COMMENT ON TABLE sheet_permissions IS 'مجوزهای دسترسی به شیت‌ها';
COMMENT ON TABLE public_links IS 'لینک‌های عمومی برای اشتراک‌گذاری';
COMMENT ON TABLE sheet_history IS 'تاریخچه تغییرات شیت‌ها';
COMMENT ON TABLE user_roles IS 'نقش‌های کاربری سیستم';

-- پایان اسکریپت
SELECT 'Database setup completed successfully!' as status;
