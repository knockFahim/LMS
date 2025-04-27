import { sql } from "drizzle-orm";
import { db } from "./drizzle";

/**
 * Script to create the book_holds table and related enum
 * Run this with: npx tsx database/create-holds-table.ts
 */
async function createHoldsTable() {
  console.log("Creating hold_status enum type and book_holds table...");

  try {
    // First check if the hold_status enum type already exists
    const checkEnumResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 
        FROM pg_type 
        WHERE typname = 'hold_status'
      );
    `);

    const enumExists = checkEnumResult[0].exists;

    if (!enumExists) {
      console.log("Creating hold_status enum type...");
      await db.execute(sql`
        CREATE TYPE hold_status AS ENUM ('WAITING', 'READY', 'FULFILLED', 'CANCELLED', 'EXPIRED');
      `);
      console.log("hold_status enum type created successfully");
    } else {
      console.log("hold_status enum type already exists, skipping creation");
    }

    // Check if the book_holds table already exists
    const checkTableResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'book_holds'
      );
    `);

    const tableExists = checkTableResult[0].exists;

    if (!tableExists) {
      console.log("Creating book_holds table...");
      await db.execute(sql`
        CREATE TABLE "book_holds" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "user_id" uuid NOT NULL,
          "book_id" uuid NOT NULL,
          "request_date" timestamp with time zone DEFAULT now() NOT NULL,
          "notification_date" timestamp with time zone,
          "status" hold_status DEFAULT 'WAITING' NOT NULL,
          "expiry_date" timestamp with time zone,
          "notes" text,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
          CONSTRAINT "book_holds_id_unique" UNIQUE("id")
        );

        ALTER TABLE "book_holds" ADD CONSTRAINT "book_holds_user_id_users_id_fk" 
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
          
        ALTER TABLE "book_holds" ADD CONSTRAINT "book_holds_book_id_books_id_fk" 
          FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE no action ON UPDATE no action;
      `);
      console.log("book_holds table created successfully");
    } else {
      console.log("book_holds table already exists, skipping creation");
    }

    console.log("Setup completed successfully!");
    return true;
  } catch (error) {
    console.error("Error creating book_holds table:", error);
    return false;
  }
}

// Execute the function
createHoldsTable()
  .then((success) => {
    console.log(success ? "Script completed successfully" : "Script failed");
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
