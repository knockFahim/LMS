CREATE TABLE "library_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subject" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"status" "message_status" DEFAULT 'UNREAD' NOT NULL,
	"admin_response" text,
	"admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "library_messages_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "library_messages" ADD CONSTRAINT "library_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_messages" ADD CONSTRAINT "library_messages_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;