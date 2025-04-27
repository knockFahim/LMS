CREATE TABLE "book_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"request_date" timestamp with time zone DEFAULT now() NOT NULL,
	"notification_date" timestamp with time zone,
	"status" "hold_status" DEFAULT 'WAITING' NOT NULL,
	"expiry_date" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "book_holds_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "book_holds" ADD CONSTRAINT "book_holds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_holds" ADD CONSTRAINT "book_holds_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;