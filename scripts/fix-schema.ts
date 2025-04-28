import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { sql } from "drizzle-orm";

// Load environment variables
config({ path: ".env.local" });

/**
 * Script to fix common database schema issues
 * This can be used when migrations fail or push commands don't work correctly
 */
const fixSchema = async () => {
    if (!process.env.DATABASE_URL) {
        console.error(
            "❌ DATABASE_URL is not defined in environment variables"
        );
        process.exit(1);
    }

    console.log("🔄 Connecting to database...");

    try {
        const client = neon(process.env.DATABASE_URL);
        const db = drizzle(client);

        console.log("✅ Connected to database");

        // Track all changes made
        const changes: Record<string, boolean> = {};

        // 1. Check and create ENUM types
        console.log("\n🔍 Checking ENUM types...");

        // Check if booking_status type exists
        const bookingStatusCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'booking_status'
      );
    `);

        const bookingStatusExists = bookingStatusCheck.rows[0]?.exists === true;

        if (!bookingStatusExists) {
            console.log("Creating booking_status ENUM type...");
            await db.execute(sql`
        CREATE TYPE booking_status AS ENUM ('BOOKED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
      `);
            changes["created_booking_status_enum"] = true;
        }

        // Check if room_type type exists
        const roomTypeCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'room_type'
      );
    `);

        const roomTypeExists = roomTypeCheck.rows[0]?.exists === true;

        if (!roomTypeExists) {
            console.log("Creating room_type ENUM type...");
            await db.execute(sql`
        CREATE TYPE room_type AS ENUM ('INDIVIDUAL_POD', 'GROUP_ROOM');
      `);
            changes["created_room_type_enum"] = true;
        }

        // 2. Check and fix table columns
        console.log("\n🔍 Checking table columns...");

        // Check room_bookings.status
        const statusCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='room_bookings' AND column_name='status'
      );
    `);

        const statusExists = statusCheck.rows[0]?.exists === true;

        if (!statusExists) {
            console.log("Adding status column to room_bookings table...");
            await db.execute(sql`
        ALTER TABLE room_bookings ADD COLUMN status booking_status DEFAULT 'BOOKED' NOT NULL;
      `);
            changes["added_status_column"] = true;
        }

        // Check room_bookings.checkin_time
        const checkinTimeCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='room_bookings' AND column_name='checkin_time'
      );
    `);

        const checkinTimeExists = checkinTimeCheck.rows[0]?.exists === true;

        if (!checkinTimeExists) {
            console.log("Adding checkin_time column to room_bookings table...");
            await db.execute(sql`
        ALTER TABLE room_bookings ADD COLUMN checkin_time timestamp with time zone;
      `);
            changes["added_checkin_time_column"] = true;
        }

        // 3. Check for other potential issues
        console.log("\n🔍 Checking for other schema issues...");

        // Validate that important tables exist
        const tables = ["users", "books", "room_bookings", "library_rooms"];

        for (const table of tables) {
            const tableCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_name=${table}
        );
      `);

            const tableExists = tableCheck.rows[0]?.exists === true;

            if (!tableExists) {
                console.log(`⚠️ Table ${table} is missing!`);
                changes[`missing_table_${table}`] = true;
            } else {
                console.log(`✅ Table ${table} exists`);
            }
        }

        // Summary
        console.log("\n📝 Schema fix summary:");

        if (Object.keys(changes).length === 0) {
            console.log("✅ No schema issues detected or fixed");
        } else {
            console.log("The following changes were made:");
            for (const [key, value] of Object.entries(changes)) {
                if (value) {
                    console.log(`- ${key.replace(/_/g, " ")}`);
                }
            }
        }

        console.log("\n✅ Schema check completed");
    } catch (error) {
        console.error("❌ Error fixing schema:", error);
        process.exit(1);
    }
};

fixSchema();
