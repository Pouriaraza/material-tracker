-- Add new columns to reserve_items table if they don't exist
DO $$
BEGIN
    -- Add priority column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reserve_items' AND column_name = 'priority') THEN
        ALTER TABLE reserve_items ADD COLUMN priority TEXT DEFAULT 'medium';
    END IF;

    -- Add category column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reserve_items' AND column_name = 'category') THEN
        ALTER TABLE reserve_items ADD COLUMN category TEXT DEFAULT '';
    END IF;

    -- Add due_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reserve_items' AND column_name = 'due_date') THEN
        ALTER TABLE reserve_items ADD COLUMN due_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    END IF;
END
$$;
