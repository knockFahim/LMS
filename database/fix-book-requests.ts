import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";

// Load environment variables
config({ path: ".env.local" });

// Set up database connection
const sqlClient = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sqlClient });

async function createBookRequestsTable() {
  try {
    console.log("Checking if book_requests table exists...");

    // Check if the table already exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'book_requests'
      );
    `);

    const tableExists = tableCheck[0]?.exists;

    if (tableExists) {
      console.log("The book_requests table already exists!");
      return;
    }

    console.log("Creating book_requests table...");

    // Create the request_status enum if it doesn't exist
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
          CREATE TYPE request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
        END IF;
      END$$;
    `);

    // Create the book_requests table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS book_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        user_id uuid NOT NULL,
        title varchar(255) NOT NULL,
        author varchar(255),
        genre varchar(255),
        description text,
        status request_status DEFAULT 'PENDING' NOT NULL,
        admin_note text,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now(),
        CONSTRAINT book_requests_id_unique UNIQUE(id)
      );
    `);

    // Add foreign key constraint
    await db.execute(sql`
      ALTER TABLE book_requests 
      ADD CONSTRAINT book_requests_user_id_users_id_fk 
      FOREIGN KEY (user_id) REFERENCES users(id) 
      ON DELETE NO ACTION ON UPDATE NO ACTION;
    `);

    console.log("Successfully created book_requests table!");
  } catch (error) {
    console.error("Error creating book_requests table:", error);
  }
}

// Run the function
createBookRequestsTable()
  .then(() => {
    console.log("Table creation process completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error in script execution:", error);
    process.exit(1);
  });
