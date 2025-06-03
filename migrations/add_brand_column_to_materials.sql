-- Add brand column to materials table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'materials'
        AND column_name = 'brand'
    ) THEN
        ALTER TABLE materials ADD COLUMN brand TEXT DEFAULT 'ericsson';
    END IF;
END $$;
