CREATE TABLE "book_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"author" varchar(255),
	"genre" varchar(255),
	"description" text,
	"status" "request_status" DEFAULT 'PENDING' NOT NULL,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "book_requests_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "book_requests" ADD CONSTRAINT "book_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;