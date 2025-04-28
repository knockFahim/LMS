import { NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { sql } from "drizzle-orm";

export async function POST() {
    try {
        // Check if booking_status type exists
        const typeCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'booking_status'
      );
    `);

        const typeExists = typeCheck.rows[0]?.exists === true;

        if (!typeExists) {
            // Create the enum type if it doesn't exist
            await db.execute(sql`
        CREATE TYPE booking_status AS ENUM ('BOOKED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
      `);
            console.log("Created booking_status enum type");
        }

        // Check if the status column exists
        const columnCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='room_bookings' AND column_name='status'
      );
    `);

        const columnExists = columnCheck.rows[0]?.exists === true;

        if (!columnExists) {
            // Add the status column to the room_bookings table
            await db.execute(sql`
        ALTER TABLE room_bookings ADD COLUMN status booking_status DEFAULT 'BOOKED' NOT NULL;
      `);
            console.log("Added status column to room_bookings table");
        }

        return NextResponse.json({
            success: true,
            message: "Fixed room_bookings table structure",
            typeAdded: !typeExists,
            columnAdded: !columnExists,
        });
    } catch (error) {
        console.error("Error fixing room_bookings table:", error);
        return NextResponse.json(
            {
                error: "Failed to fix room_bookings table",
                details: error.message,
            },
            { status: 500 }
        );
    }
}
