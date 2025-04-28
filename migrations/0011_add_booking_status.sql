-- Add ENUM type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM ('BOOKED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
    END IF;
END$$;

-- Add status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='room_bookings' AND column_name='status'
    ) THEN
        ALTER TABLE room_bookings ADD COLUMN status booking_status DEFAULT 'BOOKED' NOT NULL;
    END IF;
END$$;