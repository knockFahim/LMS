import { NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { sql } from "drizzle-orm";

export async function POST() {
    try {
        // Object to track changes
        const changes = {
            bookingStatusTypeAdded: false,
            statusColumnAdded: false,
            checkinTimeColumnAdded: false,
            roomTypeEnumAdded: false,
            roomTypeColumnAdded: false,
            notesColumnAdded: false,
        };

        // 1. Fix room_type enum and column in library_rooms

        // Check if room_type enum exists
        const roomTypeEnumCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'room_type'
      );
    `);

        const roomTypeEnumExists = roomTypeEnumCheck.rows[0]?.exists === true;

        if (!roomTypeEnumExists) {
            // Create the room_type enum if it doesn't exist
            await db.execute(sql`
        CREATE TYPE room_type AS ENUM ('INDIVIDUAL_POD', 'GROUP_ROOM');
      `);
            console.log("Created room_type enum type");
            changes.roomTypeEnumAdded = true;
        }

        // Check if room_type column exists in library_rooms
        const roomTypeColumnCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='library_rooms' AND column_name='room_type'
      );
    `);

        const roomTypeColumnExists =
            roomTypeColumnCheck.rows[0]?.exists === true;

        if (!roomTypeColumnExists) {
            // Add the room_type column to the library_rooms table
            await db.execute(sql`
        ALTER TABLE library_rooms ADD COLUMN room_type room_type DEFAULT 'INDIVIDUAL_POD' NOT NULL;
      `);
            console.log("Added room_type column to library_rooms table");
            changes.roomTypeColumnAdded = true;
        }

        // 2. Fix booking_status enum and related columns in room_bookings

        // Check if booking_status type exists
        const bookingStatusCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'booking_status'
      );
    `);

        const bookingStatusExists = bookingStatusCheck.rows[0]?.exists === true;

        if (!bookingStatusExists) {
            // Create the enum type if it doesn't exist
            await db.execute(sql`
        CREATE TYPE booking_status AS ENUM ('BOOKED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
      `);
            console.log("Created booking_status enum type");
            changes.bookingStatusTypeAdded = true;
        }

        // Check if the status column exists
        const statusCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='room_bookings' AND column_name='status'
      );
    `);

        const statusExists = statusCheck.rows[0]?.exists === true;

        if (!statusExists) {
            // Add the status column to the room_bookings table
            await db.execute(sql`
        ALTER TABLE room_bookings ADD COLUMN status booking_status DEFAULT 'BOOKED' NOT NULL;
      `);
            console.log("Added status column to room_bookings table");
            changes.statusColumnAdded = true;
        }

        // Check if the checkin_time column exists
        const checkinTimeCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='room_bookings' AND column_name='checkin_time'
      );
    `);

        const checkinTimeExists = checkinTimeCheck.rows[0]?.exists === true;

        if (!checkinTimeExists) {
            // Add the checkin_time column to the room_bookings table
            await db.execute(sql`
        ALTER TABLE room_bookings ADD COLUMN checkin_time timestamp with time zone;
      `);
            console.log("Added checkin_time column to room_bookings table");
            changes.checkinTimeColumnAdded = true;
        }

        // Check if the notes column exists
        const notesCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='room_bookings' AND column_name='notes'
      );
    `);

        const notesExists = notesCheck.rows[0]?.exists === true;

        if (!notesExists) {
            // Add the notes column to the room_bookings table
            await db.execute(sql`
        ALTER TABLE room_bookings ADD COLUMN notes text;
      `);
            console.log("Added notes column to room_bookings table");
            changes.notesColumnAdded = true;
        }

        return NextResponse.json({
            success: true,
            message: "Fixed database table structure",
            changes,
        });
    } catch (error) {
        console.error("Error fixing database tables:", error);
        return NextResponse.json(
            {
                error: "Failed to fix database tables",
                details: error.message,
            },
            { status: 500 }
        );
    }
}
