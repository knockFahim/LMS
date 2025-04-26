"use server";

import { db } from "./drizzle";
import { sql } from "drizzle-orm";

/**
 * This script applies the library_messages table migration directly
 */
export async function applyLibraryMessagesTable() {
  try {
    // First check if message_status enum type exists, create if not
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_status') THEN
          CREATE TYPE message_status AS ENUM ('UNREAD', 'READ', 'REPLIED');
        END IF;
      END
      $$;
    `);

    // Then try to create the library_messages table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "library_messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "subject" varchar(255) NOT NULL,
        "message" text NOT NULL,
        "status" message_status DEFAULT 'UNREAD' NOT NULL,
        "admin_response" text,
        "admin_id" uuid,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "library_messages_id_unique" UNIQUE("id")
      );
    `);

    // Add foreign key constraints
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'library_messages_user_id_users_id_fk'
        ) THEN
          ALTER TABLE "library_messages" 
          ADD CONSTRAINT "library_messages_user_id_users_id_fk" 
          FOREIGN KEY ("user_id") REFERENCES "users"("id") 
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
          WHERE constraint_name = 'library_messages_admin_id_users_id_fk'
        ) THEN
          ALTER TABLE "library_messages" 
          ADD CONSTRAINT "library_messages_admin_id_users_id_fk" 
          FOREIGN KEY ("admin_id") REFERENCES "users"("id") 
          ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);

    return {
      success: true,
      message: "Library messages table created successfully",
    };
  } catch (error) {
    console.error("Error applying library messages table:", error);
    return {
      success: false,
      message: "Failed to create library messages table",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
