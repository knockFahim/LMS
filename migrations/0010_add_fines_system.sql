-- Add fines table and related enums

-- Create fine_status enum type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fine_status') THEN
    CREATE TYPE fine_status AS ENUM ('PENDING', 'PAID', 'WAIVED');
  END IF;
END$$;

-- Create fine_type enum type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fine_type') THEN
    CREATE TYPE fine_type AS ENUM ('OVERDUE', 'DAMAGE', 'LOST');
  END IF;
END$$;

-- Add BLOCKED value to the status enum type for users
ALTER TYPE status ADD VALUE IF NOT EXISTS 'BLOCKED';

-- Create the fines table
CREATE TABLE IF NOT EXISTS "fines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "borrow_record_id" uuid NOT NULL,
  "amount" decimal(10, 2) NOT NULL,
  "fine_type" fine_type NOT NULL,
  "status" fine_status DEFAULT 'PENDING' NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "paid_at" timestamp with time zone,
  "waived_at" timestamp with time zone,
  "waived_by" uuid,
  CONSTRAINT "fines_id_unique" UNIQUE("id"),
  CONSTRAINT "fines_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "fines_borrow_record_id_fk" FOREIGN KEY ("borrow_record_id") REFERENCES "borrow_records"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "fines_waived_by_fk" FOREIGN KEY ("waived_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Add LOST value to the borrow_status enum type
ALTER TYPE borrow_status ADD VALUE IF NOT EXISTS 'LOST';
