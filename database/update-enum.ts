import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function updateEnumValues() {
  try {
    console.log("Adding LOST status to borrow_status enum...");
    await sql`ALTER TYPE borrow_status ADD VALUE IF NOT EXISTS 'LOST'`;
    console.log("Successfully added LOST status to borrow_status enum");

    console.log("Adding BLOCKED status to status enum...");
    await sql`ALTER TYPE status ADD VALUE IF NOT EXISTS 'BLOCKED'`;
    console.log("Successfully added BLOCKED status to status enum");

    console.log("All enum values added successfully!");
  } catch (error) {
    console.error("Error adding enum values:", error);
  } finally {
    process.exit(0);
  }
}

updateEnumValues();
