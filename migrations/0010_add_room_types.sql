-- Create room_type enum type
CREATE TYPE room_type AS ENUM ('INDIVIDUAL_POD', 'GROUP_ROOM');

-- Create booking_status enum type
CREATE TYPE booking_status AS ENUM ('BOOKED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- Add room_type to library_rooms
ALTER TABLE "library_rooms" 
ADD COLUMN IF NOT EXISTS "room_type" "room_type" DEFAULT 'INDIVIDUAL_POD' NOT NULL;

-- Add description to library_rooms
ALTER TABLE "library_rooms" 
ADD COLUMN IF NOT EXISTS "description" text;

-- Add status to room_bookings
ALTER TABLE "room_bookings" 
ADD COLUMN IF NOT EXISTS "status" "booking_status" DEFAULT 'BOOKED' NOT NULL;

-- Add checkin_time to room_bookings
ALTER TABLE "room_bookings" 
ADD COLUMN IF NOT EXISTS "checkin_time" timestamp with time zone;

-- Add notes to room_bookings
ALTER TABLE "room_bookings" 
ADD COLUMN IF NOT EXISTS "notes" text;