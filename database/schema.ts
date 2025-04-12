import {
  integer,
  text,
  pgTable,
  varchar,
  pgEnum,
  date,
  timestamp,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";

const ROLE_ENUM = pgEnum("role", ["USER", "ADMIN"]);
const STATUS_ENUM = pgEnum("status", ["PENDING", "APPROVED", "REJECTED"]);
const BORROW_STATUS_ENUM = pgEnum("borrow_status", [
  "OVERDUE",
  "BORROWED",
  "RETURNED",
]);
const REQUEST_STATUS_ENUM = pgEnum("request_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);
const EXTENSION_STATUS_ENUM = pgEnum("extension_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const users = pgTable("users", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  fullname: varchar("fullname", { length: 255 }).notNull(),
  email: text("email").notNull().unique(),
  universityId: integer("university_id").notNull().unique(),
  password: text("password").notNull(),
  universityCard: text("university_card").notNull(),
  status: STATUS_ENUM("status").default("PENDING"),
  role: ROLE_ENUM("role").default("USER"),
  lastActivityDate: date("last_activity_date").defaultNow(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).defaultNow(),
});

export const books = pgTable("books", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }).notNull(),
  genre: text("genre").notNull(),
  rating: integer("rating").notNull(),
  coverUrl: text("cover_url").notNull(),
  coverColor: varchar("cover_color", { length: 7 }).notNull(),
  description: text("description").notNull(),
  totalCopies: integer("total_copies").notNull().default(0),
  availableCopies: integer("available_copies").notNull().default(0),
  videoUrl: text("video_url").notNull(),
  summary: varchar("summary").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const announcements = pgTable("announcements", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const borrowRecords = pgTable("borrow_records", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  bookId: uuid("book_id")
    .references(() => books.id)
    .notNull(),
  borrowDate: timestamp("borrow_date", { withTimezone: true })
    .defaultNow()
    .notNull(),
  dueDate: date("due_date").notNull(),
  returnDate: date("return_date"),
  status: BORROW_STATUS_ENUM("status").default("BORROWED").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const bookRequests = pgTable("book_requests", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }),
  genre: varchar("genre", { length: 255 }),
  description: text("description"),
  status: REQUEST_STATUS_ENUM("status").default("PENDING").notNull(),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const extensionRequests = pgTable("extension_requests", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  borrowRecordId: uuid("borrow_record_id")
    .references(() => borrowRecords.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  requestDate: timestamp("request_date", { withTimezone: true })
    .defaultNow()
    .notNull(),
  currentDueDate: date("current_due_date").notNull(),
  requestedDueDate: date("requested_due_date").notNull(),
  reason: text("reason"),
  status: EXTENSION_STATUS_ENUM("status").default("PENDING").notNull(),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
