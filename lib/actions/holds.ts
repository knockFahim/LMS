"use server";

import dayjs from "dayjs";
import { and, count, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/database/drizzle";
import { bookHolds, books, borrowRecords, users } from "@/database/schema";
import { sendEmail } from "@/lib/workflow";

interface PlaceHoldParams {
  userId: string;
  bookId: string;
}

/**
 * Place a hold on a book that is currently unavailable
 */
export async function placeHold(params: PlaceHoldParams) {
  const { userId, bookId } = params;

  try {
    // Check if the book exists and has no copies available
    const book = await db
      .select({
        title: books.title,
        author: books.author,
        availableCopies: books.availableCopies,
      })
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);

    if (!book.length) {
      return {
        success: false,
        error: "Book not found",
      };
    }

    // If there are available copies, the user should borrow the book instead of placing a hold
    if (book[0].availableCopies > 0) {
      return {
        success: false,
        error: "This book is currently available. You can borrow it directly.",
      };
    }

    // Check if user already has an active hold on this book
    const existingHold = await db
      .select()
      .from(bookHolds)
      .where(
        and(
          eq(bookHolds.userId, userId),
          eq(bookHolds.bookId, bookId),
          sql`${bookHolds.status} IN ('WAITING', 'READY')`
        )
      )
      .limit(1);

    if (existingHold.length > 0) {
      return {
        success: false,
        error: "You already have a hold on this book",
      };
    }

    // Check if user is already borrowing the book
    const existingBorrow = await db
      .select()
      .from(borrowRecords)
      .where(
        and(
          eq(borrowRecords.userId, userId),
          eq(borrowRecords.bookId, bookId),
          eq(borrowRecords.status, "BORROWED")
        )
      )
      .limit(1);

    if (existingBorrow.length > 0) {
      return {
        success: false,
        error: "You are currently borrowing this book",
      };
    }

    // Create a new hold record
    const newHold = await db
      .insert(bookHolds)
      .values({
        userId,
        bookId,
        status: "WAITING",
      })
      .returning();

    // Get user email for confirmation
    const user = await db
      .select({
        email: users.email,
        fullname: users.fullname,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length > 0) {
      try {
        // Send confirmation email
        const confirmationMessage = `
          <div>
            <p>Hi ${user[0].fullname},</p>
            <p>You have successfully placed a hold on <strong>"${book[0].title}"</strong> by ${book[0].author}.</p>
            <p>You will be notified when the book becomes available for pickup.</p>
            <p>Thank you for using our library services!</p>
          </div>
        `;

        await sendEmail({
          email: user[0].email,
          subject: `Hold Placed: ${book[0].title}`,
          message: confirmationMessage,
          plainText: false,
        });
      } catch (emailError) {
        console.error("Error sending hold confirmation email:", emailError);
        // Continue with success even if email fails
      }
    }

    revalidatePath("/my-profile");
    revalidatePath(`/books/${bookId}`);

    return {
      success: true,
      data: newHold[0],
    };
  } catch (error) {
    console.error("Error placing hold:", error);
    return {
      success: false,
      error: "An error occurred while placing hold",
    };
  }
}

/**
 * Cancels a hold that a user has placed
 */
export async function cancelHold(holdId: string) {
  try {
    const hold = await db
      .select({
        ...getTableColumns(bookHolds),
        book: {
          title: books.title,
        },
      })
      .from(bookHolds)
      .innerJoin(books, eq(bookHolds.bookId, books.id))
      .where(eq(bookHolds.id, holdId))
      .limit(1);

    if (!hold.length) {
      return {
        success: false,
        error: "Hold not found",
      };
    }

    if (hold[0].status === "FULFILLED" || hold[0].status === "CANCELLED") {
      return {
        success: false,
        error: `This hold has already been ${hold[0].status.toLowerCase()}`,
      };
    }

    // Update the hold status to CANCELLED
    await db
      .update(bookHolds)
      .set({
        status: "CANCELLED",
        updatedAt: new Date(),
      })
      .where(eq(bookHolds.id, holdId));

    // Get user details for email notification
    const user = await db
      .select({
        email: users.email,
        fullname: users.fullname,
      })
      .from(users)
      .where(eq(users.id, hold[0].userId))
      .limit(1);

    if (user.length > 0) {
      try {
        const cancellationMessage = `
          <div>
            <p>Hi ${user[0].fullname},</p>
            <p>Your hold for <strong>"${hold[0].book.title}"</strong> has been cancelled as requested.</p>
            <p>Thank you for using our library services!</p>
          </div>
        `;

        await sendEmail({
          email: user[0].email,
          subject: `Hold Cancelled: ${hold[0].book.title}`,
          message: cancellationMessage,
          plainText: false,
        });
      } catch (emailError) {
        console.error("Error sending hold cancellation email:", emailError);
      }
    }

    revalidatePath("/my-profile");

    return {
      success: true,
      message: "Hold cancelled successfully",
    };
  } catch (error) {
    console.error("Error cancelling hold:", error);
    return {
      success: false,
      error: "An error occurred while cancelling the hold",
    };
  }
}

/**
 * Get all holds for a user
 */
export async function getUserHolds(userId: string) {
  try {
    const holds = await db
      .select({
        ...getTableColumns(bookHolds),
        book: {
          ...getTableColumns(books),
        },
      })
      .from(bookHolds)
      .innerJoin(books, eq(bookHolds.bookId, books.id))
      .where(eq(bookHolds.userId, userId))
      .orderBy(desc(bookHolds.requestDate));

    return {
      success: true,
      data: JSON.parse(JSON.stringify(holds)),
    };
  } catch (error) {
    console.error("Error getting user holds:", error);
    return {
      success: false,
      error: "An error occurred while retrieving holds",
    };
  }
}

/**
 * Get active holds for a specific book
 */
export async function getBookHolds(bookId: string) {
  try {
    const holds = await db
      .select({
        ...getTableColumns(bookHolds),
        user: {
          fullname: users.fullname,
          email: users.email,
        },
      })
      .from(bookHolds)
      .innerJoin(users, eq(bookHolds.userId, users.id))
      .where(
        and(
          eq(bookHolds.bookId, bookId),
          sql`${bookHolds.status} IN ('WAITING', 'READY')`
        )
      )
      .orderBy(bookHolds.requestDate);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(holds)),
    };
  } catch (error) {
    console.error("Error getting book holds:", error);
    return {
      success: false,
      error: "An error occurred while retrieving holds",
    };
  }
}

/**
 * Function to check for holds when a book is returned
 * and notify the next user in the queue that the book is available
 */
export async function processHoldsForReturnedBook(bookId: string) {
  try {
    // Get the oldest active hold (WAITING status) for this book
    const nextHold = await db
      .select({
        ...getTableColumns(bookHolds),
        user: {
          fullname: users.fullname,
          email: users.email,
        },
        book: {
          title: books.title,
          author: books.author,
        },
      })
      .from(bookHolds)
      .innerJoin(users, eq(bookHolds.userId, users.id))
      .innerJoin(books, eq(bookHolds.bookId, books.id))
      .where(and(eq(bookHolds.bookId, bookId), eq(bookHolds.status, "WAITING")))
      .orderBy(bookHolds.requestDate)
      .limit(1);

    if (!nextHold.length) {
      return {
        success: true,
        message: "No holds waiting for this book",
        notified: false,
      };
    }

    // Set expiry date (3 days from now)
    const expiryDate = dayjs().add(3, "day").toDate();

    // Update the hold status to READY and set notification date and expiry date
    await db
      .update(bookHolds)
      .set({
        status: "READY",
        notificationDate: new Date(),
        expiryDate,
        updatedAt: new Date(),
      })
      .where(eq(bookHolds.id, nextHold[0].id));

    // Send notification email to the user
    try {
      const formattedExpiryDate = expiryDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const notificationMessage = `
        <div>
          <p>Hi ${nextHold[0].user.fullname},</p>
          <p>Good news! The book <strong>"${nextHold[0].book.title}"</strong> by ${nextHold[0].book.author} that you placed a hold on is now available for pickup.</p>
          <p>Please visit the library to borrow this book before <strong>${formattedExpiryDate}</strong>. If not picked up by this date, the hold will expire and the book will be offered to the next person in the queue.</p>
          <p>Thank you for using our library services!</p>
        </div>
      `;

      await sendEmail({
        email: nextHold[0].user.email,
        subject: `Book Available for Pickup: ${nextHold[0].book.title}`,
        message: notificationMessage,
        plainText: false,
      });

      return {
        success: true,
        message: "Hold processed and user notified",
        notified: true,
        holdId: nextHold[0].id,
        userId: nextHold[0].userId,
      };
    } catch (emailError) {
      console.error("Error sending book availability email:", emailError);
      // Still mark as successful even if email fails
      return {
        success: true,
        message: "Hold processed but email notification failed",
        notified: false,
        holdId: nextHold[0].id,
      };
    }
  } catch (error) {
    console.error("Error processing holds for returned book:", error);
    return {
      success: false,
      error: "An error occurred while processing holds",
    };
  }
}

/**
 * Check for expired holds and update their status
 */
export async function checkExpiredHolds() {
  try {
    const now = new Date();

    // Find all READY holds that have expired
    const expiredHolds = await db
      .select({
        ...getTableColumns(bookHolds),
        book: {
          title: books.title,
        },
        user: {
          email: users.email,
          fullname: users.fullname,
        },
      })
      .from(bookHolds)
      .innerJoin(books, eq(bookHolds.bookId, books.id))
      .innerJoin(users, eq(bookHolds.userId, users.id))
      .where(
        and(
          eq(bookHolds.status, "READY"),
          sql`${bookHolds.expiryDate} < ${now}`
        )
      );

    if (!expiredHolds.length) {
      return {
        success: true,
        message: "No expired holds found",
        updatedCount: 0,
      };
    }

    // Update all expired holds to EXPIRED status
    for (const hold of expiredHolds) {
      // Update the hold status
      await db
        .update(bookHolds)
        .set({
          status: "EXPIRED",
          updatedAt: now,
        })
        .where(eq(bookHolds.id, hold.id));

      // Process the next hold for this book
      await processHoldsForReturnedBook(hold.bookId);

      // Send notification email about the expired hold
      try {
        const expirationMessage = `
          <div>
            <p>Hi ${hold.user.fullname},</p>
            <p>Your hold for <strong>"${hold.book.title}"</strong> has expired because the pickup period has passed.</p>
            <p>If you are still interested in this book, you can place a new hold request.</p>
            <p>Thank you for using our library services!</p>
          </div>
        `;

        await sendEmail({
          email: hold.user.email,
          subject: `Hold Expired: ${hold.book.title}`,
          message: expirationMessage,
          plainText: false,
        });
      } catch (emailError) {
        console.error("Error sending hold expiration email:", emailError);
      }
    }

    revalidatePath("/admin/holds");

    return {
      success: true,
      message: `Updated ${expiredHolds.length} expired holds`,
      updatedCount: expiredHolds.length,
    };
  } catch (error) {
    console.error("Error checking expired holds:", error);
    return {
      success: false,
      error: "An error occurred while checking expired holds",
    };
  }
}

/**
 * Function to fulfill a hold (mark as borrowed)
 */
export async function fulfillHold(holdId: string) {
  try {
    // Get the hold record
    const hold = await db
      .select()
      .from(bookHolds)
      .where(eq(bookHolds.id, holdId))
      .limit(1);

    if (!hold.length) {
      return {
        success: false,
        error: "Hold not found",
      };
    }

    if (hold[0].status !== "READY") {
      return {
        success: false,
        error: "This hold is not ready for fulfillment",
      };
    }

    // Update the hold status to FULFILLED
    await db
      .update(bookHolds)
      .set({
        status: "FULFILLED",
        updatedAt: new Date(),
      })
      .where(eq(bookHolds.id, holdId));

    // Mark as success - the borrowing process will be handled separately
    return {
      success: true,
      message: "Hold fulfilled successfully",
    };
  } catch (error) {
    console.error("Error fulfilling hold:", error);
    return {
      success: false,
      error: "An error occurred while fulfilling the hold",
    };
  }
}
