import { sql } from "drizzle-orm";
import { db } from "./drizzle";

/**
 * Direct script to create the hold_status enum type and book_holds table
 * This bypasses Drizzle's migration system to directly execute the SQL
 */
async function createHoldsTable() {
  console.log(
    "Starting creation of hold_status enum type and book_holds table..."
  );

  try {
    // Create the hold_status enum type
    console.log("Creating hold_status enum type...");
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hold_status') THEN
          CREATE TYPE hold_status AS ENUM ('WAITING', 'READY', 'FULFILLED', 'CANCELLED', 'EXPIRED');
        END IF;
      END
      $$;
    `);
    console.log("hold_status enum type created successfully or already exists");

    // Create the book_holds table with a direct SQL command
    console.log("Creating book_holds table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "book_holds" (
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
    `);
    console.log("book_holds table created successfully or already exists");

    // Add foreign key constraints if they don't exist
    console.log("Adding foreign key constraints...");
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'book_holds_user_id_users_id_fk'
        ) THEN
          ALTER TABLE "book_holds" 
          ADD CONSTRAINT "book_holds_user_id_users_id_fk" 
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'book_holds_book_id_books_id_fk'
        ) THEN
          ALTER TABLE "book_holds" 
          ADD CONSTRAINT "book_holds_book_id_books_id_fk" 
          FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE no action ON UPDATE no action;
        END IF;
      END
      $$;
    `);
    console.log("Foreign key constraints added successfully or already exist");

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
