import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";

// Load environment variables
config({ path: ".env.local" });

// Set up database connection
const sqlClient = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sqlClient });

/**
 * Script to create the hold_status enum type and book_holds table
 */
async function createBookHoldsTable() {
  try {
    console.log("Creating hold_status enum type...");
    // Create the hold_status enum if it doesn't exist
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hold_status') THEN
          CREATE TYPE hold_status AS ENUM ('WAITING', 'READY', 'FULFILLED', 'CANCELLED', 'EXPIRED');
        END IF;
      END$$;
    `);
    console.log("Hold status enum created or already exists");

    console.log("Creating book_holds table...");
    // Create the book_holds table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS book_holds (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        user_id uuid NOT NULL,
        book_id uuid NOT NULL,
        request_date timestamp with time zone DEFAULT now() NOT NULL,
        notification_date timestamp with time zone,
        status hold_status DEFAULT 'WAITING' NOT NULL,
        expiry_date timestamp with time zone,
        notes text,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT book_holds_id_unique UNIQUE(id)
      );
    `);

    // Add foreign key constraints
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'book_holds_user_id_users_id_fk'
        ) THEN
          ALTER TABLE book_holds 
          ADD CONSTRAINT book_holds_user_id_users_id_fk 
          FOREIGN KEY (user_id) REFERENCES users(id) 
          ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);

    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'book_holds_book_id_books_id_fk'
        ) THEN
          ALTER TABLE book_holds 
          ADD CONSTRAINT book_holds_book_id_books_id_fk 
          FOREIGN KEY (book_id) REFERENCES books(id) 
          ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);

    console.log("Successfully created book_holds table!");
  } catch (error) {
    console.error("Error creating book_holds table:", error);
  }
}

// Run the function
createBookHoldsTable()
  .then(() => {
    console.log("Table creation process completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error in script execution:", error);
    process.exit(1);
  });
