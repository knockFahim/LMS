import { NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { sql } from "drizzle-orm";

export async function POST() {
    try {
        // Object to track changes
        const changes = {
            roomTypeEnumAdded: false,
            roomTypeColumnAdded: false,
            descriptionColumnAdded: false,
            roomsCreated: false,
        };

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

        // Check if library_rooms table exists
        const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'library_rooms'
      );
    `);

        const tableExists = tableCheck.rows[0]?.exists === true;

        if (!tableExists) {
            // Create the library_rooms table if it doesn't exist
            await db.execute(sql`
        CREATE TABLE "library_rooms" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "room_number" varchar(50) NOT NULL,
          "capacity" integer NOT NULL,
          "room_type" room_type DEFAULT 'INDIVIDUAL_POD' NOT NULL,
          "description" text,
          "created_at" timestamp with time zone DEFAULT now(),
          "updated_at" timestamp with time zone DEFAULT now()
        );
      `);
            console.log("Created library_rooms table");
            changes.roomsCreated = true;
        } else {
            // Check if room_type column exists
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

            // Check if description column exists
            const descriptionColumnCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name='library_rooms' AND column_name='description'
        );
      `);

            const descriptionColumnExists =
                descriptionColumnCheck.rows[0]?.exists === true;

            if (!descriptionColumnExists) {
                // Add the description column to the library_rooms table
                await db.execute(sql`
          ALTER TABLE library_rooms ADD COLUMN description text;
        `);
                console.log("Added description column to library_rooms table");
                changes.descriptionColumnAdded = true;
            }
        }

        // Insert sample rooms if none exist
        const roomCount = await db.execute(
            sql`SELECT COUNT(*) FROM library_rooms`
        );
        const count = parseInt(roomCount.rows[0]?.count || "0");

        if (count === 0) {
            // Insert some default rooms
            await db.execute(sql`
        INSERT INTO library_rooms (room_number, capacity, room_type, description)
        VALUES 
          ('A101', 1, 'INDIVIDUAL_POD', 'Quiet study pod for individual work'),
          ('A102', 1, 'INDIVIDUAL_POD', 'Quiet study pod for individual work'),
          ('B201', 6, 'GROUP_ROOM', 'Group discussion room with whiteboard'),
          ('B202', 8, 'GROUP_ROOM', 'Large group room with projector');
      `);
            console.log("Added sample rooms to library_rooms table");
            changes.roomsCreated = true;
        }

        return NextResponse.json({
            success: true,
            message: "Fixed library_rooms table structure",
            changes,
        });
    } catch (error) {
        console.error("Error fixing library_rooms table:", error);
        return NextResponse.json(
            {
                error: "Failed to fix library_rooms table",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
