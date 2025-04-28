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
const MESSAGE_STATUS_ENUM = pgEnum("message_status", [
    "UNREAD",
    "READ",
    "REPLIED",
]);
const HOLD_STATUS_ENUM = pgEnum("hold_status", [
    "WAITING", // Waiting for book to be returned
    "READY", // Book is available for pickup
    "FULFILLED", // Hold was fulfilled (book was borrowed by requestor)
    "CANCELLED", // Hold was cancelled by user or admin
    "EXPIRED", // Hold expired (user didn't pick up the book in time)
]);
const ROOM_TYPE_ENUM = pgEnum("room_type", [
    "INDIVIDUAL_POD", // Individual study pod
    "GROUP_ROOM", // Group discussion room
]);
const BOOKING_STATUS_ENUM = pgEnum("booking_status", [
    "BOOKED", // Room is booked
    "CHECKED_IN", // User has checked in
    "COMPLETED", // Booking period is over
    "CANCELLED", // Booking was cancelled
    "NO_SHOW", // User did not show up
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

// Reviews table for book ratings and comments
export const reviews = pgTable("reviews", {
    id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
    userId: uuid("user_id")
        .references(() => users.id)
        .notNull(),
    bookId: uuid("book_id")
        .references(() => books.id)
        .notNull(),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});

export const libraryMessages = pgTable("library_messages", {
    id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
    userId: uuid("user_id")
        .references(() => users.id)
        .notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    message: text("message").notNull(),
    status: MESSAGE_STATUS_ENUM("status").default("UNREAD").notNull(),
    adminResponse: text("admin_response"),
    adminId: uuid("admin_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});

// Book holds table for tracking hold requests
export const bookHolds = pgTable("book_holds", {
    id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
    userId: uuid("user_id")
        .references(() => users.id)
        .notNull(),
    bookId: uuid("book_id")
        .references(() => books.id)
        .notNull(),
    requestDate: timestamp("request_date", { withTimezone: true })
        .defaultNow()
        .notNull(),
    notificationDate: timestamp("notification_date", { withTimezone: true }),
    status: HOLD_STATUS_ENUM("status").default("WAITING").notNull(),
    expiryDate: timestamp("expiry_date", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});

export const libraryRooms = pgTable("library_rooms", {
    id: uuid("id").primaryKey().defaultRandom(),
    roomNumber: varchar("room_number", { length: 50 }).notNull(),
    capacity: integer("capacity").notNull(),
    roomType: ROOM_TYPE_ENUM("room_type").default("INDIVIDUAL_POD").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const roomBookings = pgTable("room_bookings", {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
        .references(() => libraryRooms.id)
        .notNull(),
    userId: uuid("user_id")
        .references(() => users.id)
        .notNull(),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    status: BOOKING_STATUS_ENUM("status").default("BOOKED").notNull(),
    checkinTime: timestamp("checkin_time", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
