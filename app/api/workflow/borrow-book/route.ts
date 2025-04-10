import dayjs from "dayjs";
import { and, eq } from "drizzle-orm";
import { serve } from "@upstash/workflow/nextjs";

import { db } from "@/database/drizzle";
import { sendEmail } from "@/lib/workflow";
import { borrowRecords, users, books } from "@/database/schema";

type BorrowEventData = {
  userId: string;
  bookId: string;
  borrowDate: string;
  dueDate: string;
};

async function getBookDetails(bookId: string) {
  const bookDetails = await db
    .select()
    .from(books)
    .where(eq(books.id, bookId))
    .limit(1);

  return bookDetails[0];
}

async function getUserDetails(userId: string) {
  const userDetails = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return userDetails[0];
}

async function isBookReturned(userId: string, bookId: string) {
  const borrowRecord = await db
    .select()
    .from(borrowRecords)
    .where(
      and(eq(borrowRecords.userId, userId), eq(borrowRecords.bookId, bookId))
    )
    .limit(1);

  if (borrowRecord[0].status === "RETURNED") return true;

  return false;
}

export const { POST } = serve<BorrowEventData>(async (context) => {
  const { userId, bookId, borrowDate, dueDate } = context.requestPayload;

  const book = await getBookDetails(bookId);
  const user = await getUserDetails(userId);

  const { fullname, email } = user;
  const { title, author, coverUrl } = book;

  // Calculate difference between borrow date and due date
  const diff = dayjs(dueDate).diff(dayjs(borrowDate), "day");

  const formattedDueDate = new Date(dueDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Skip sending initial emails since they're now handled directly in the borrowBook action
  // Just send reminder emails from the workflow

  // Wait until 1 day before due date to send reminder
  await context.sleep("wait-for-1-day-before-due", 60 * 60 * 24 * (diff - 1));

  // Send 1 day before due date reminder email
  await context.run("send-reminder-before-due", async () => {
    const reminderMessage = `
      <div>
        <p>Hi ${fullname},</p>
        <p>This is a friendly reminder that the book <strong>"${title}"</strong> is due tomorrow (${formattedDueDate}).</p>
        <p>Please return it on time to avoid late fees.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://library.bracu.ac.bd"}/my-profile" class="button">View your borrowed books</a></p>
      </div>
    `;

    await sendEmail({
      email,
      subject: `Reminder: "${title}" is due tomorrow!`,
      message: reminderMessage,
      plainText: false,
    });
  });

  // Wait until the due date to send the "last day" reminder
  await context.sleep("wait-for-due-date", 60 * 60 * 24 * 1);

  // Send final day reminder email
  await context.run("send-final-reminder", async () => {
    const finalReminderMessage = `
      <div>
        <p>Hi ${fullname},</p>
        <p>This is the final reminder that <strong>today</strong> is the last day to return the book <strong>"${title}"</strong>.</p>
        <p>Please return it today to avoid late fees.</p>
        <p>The library is open from 9:00 AM to 6:00 PM.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://library.bracu.ac.bd"}/my-profile" class="button">View your borrowed books</a></p>
      </div>
    `;

    await sendEmail({
      email,
      subject: `Today is the last day to return "${title}"!`,
      message: finalReminderMessage,
      plainText: false,
    });
  });

  // Wait until after due date to check if the book has been returned
  await context.sleep("wait-for-check-if-returned", 60 * 60 * 24 * 1);

  // Check if the book has been returned, if not, send overdue email
  const isReturned = await isBookReturned(userId, bookId);

  if (!isReturned) {
    await context.run("send-overdue-email", async () => {
      const overdueMessage = `
        <div>
          <p>Hi ${fullname},</p>
          <p>The book <strong>"${title}"</strong> is now <span style="color: red; font-weight: bold;">OVERDUE</span>.</p>
          <p>If you don't return it soon, you will be charged for the late return at a rate of 20 BDT per day.</p>
          <p>Please return it as soon as possible.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://library.bracu.ac.bd"}/my-profile" class="button">View your borrowed books</a></p>
        </div>
      `;

      await sendEmail({
        email,
        subject: `🚨 Overdue: Return "${title}" to avoid charges`,
        message: overdueMessage,
        plainText: false,
      });
    });
  }
});
