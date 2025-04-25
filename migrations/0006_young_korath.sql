CREATE TABLE "extension_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"borrow_record_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"request_date" timestamp with time zone DEFAULT now() NOT NULL,
	"current_due_date" date NOT NULL,
	"requested_due_date" date NOT NULL,
	"reason" text,
	"status" "extension_status" DEFAULT 'PENDING' NOT NULL,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "extension_requests_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "extension_requests" ADD CONSTRAINT "extension_requests_borrow_record_id_borrow_records_id_fk" FOREIGN KEY ("borrow_record_id") REFERENCES "public"."borrow_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_requests" ADD CONSTRAINT "extension_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;