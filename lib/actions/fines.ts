// Server actions for fines management
"use server";

import dayjs from "dayjs";
import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  gt,
  sql,
  sum,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/database/drizzle";
import { sendEmail } from "@/lib/workflow";
import { borrowRecords, books, fines, users } from "@/database/schema";

/**
 * Check for overdue books and create fines
 * This should be called daily by a cron job
 */
export async function checkOverdueAndCreateFines() {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]; // Format: YYYY-MM-DD

    // Find all books that are overdue but don't have an OVERDUE status yet
    const overdueRecords = await db
      .select({
        borrow: getTableColumns(borrowRecords),
        user: {
          fullname: users.fullname,
          email: users.email,
        },
        book: {
          title: books.title,
          author: books.author,
        },
      })
      .from(borrowRecords)
      .innerJoin(users, eq(borrowRecords.userId, users.id))
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .where(
        and(
          eq(borrowRecords.status, "BORROWED"),
          // Due date is before today
          sql`${borrowRecords.dueDate} < ${todayStr}`
        )
      );

    if (overdueRecords.length === 0) {
      return {
        success: true,
        message: "No new overdue books found",
        updatedCount: 0,
      };
    }

    // For each overdue record, update status and create a fine
    const updates = [];
    for (const record of overdueRecords) {
      // Calculate days overdue
      const dueDate = dayjs(record.borrow.dueDate);
      const daysOverdue = dayjs().diff(dueDate, "day");

      // Only create fines if at least 1 day overdue
      if (daysOverdue > 0) {
        // Calculate fine amount (5 BDT per day for books)
        const fineAmount = daysOverdue * 5; // 5 BDT per day for books

        // Create a fine record
        updates.push(
          db.insert(fines).values({
            userId: record.borrow.userId,
            borrowRecordId: record.borrow.id,
            amount: fineAmount,
            fineType: "OVERDUE",
            description: `Overdue fine for "${record.book.title}" (${daysOverdue} days late)`,
          })
        );

        // Update borrow record status to OVERDUE
        updates.push(
          db
            .update(borrowRecords)
            .set({ status: "OVERDUE" })
            .where(eq(borrowRecords.id, record.borrow.id))
        );

        // Send notification email to the user
        try {
          const formattedDueDate = dueDate.format("MMMM D, YYYY");
          await sendEmail({
            email: record.user.email,
            subject: `Overdue Book: "${record.book.title}" and Fine Imposed`,
            message: `
              <div>
                <p>Dear ${record.user.fullname},</p>
                <p>The book <strong>"${record.book.title}"</strong> by ${record.book.author} that you borrowed was due on <strong>${formattedDueDate}</strong> and is now <span style="color: red; font-weight: bold;">OVERDUE</span>.</p>
                <p>A fine of <strong>${fineAmount} BDT</strong> has been imposed for the ${daysOverdue} days it is overdue.</p>
                <p>Please return the book as soon as possible to prevent additional fines. Your borrowing privileges have been suspended until the item is returned and the fine is paid.</p>
                <p>Thank you for your cooperation.</p>
              </div>
            `,
            plainText: false,
          });
        } catch (emailError) {
          console.error(
            "Error sending overdue notification email:",
            emailError
          );
          // Continue with success even if email fails
        }
      }
    }

    // Execute all updates
    if (updates.length > 0) {
      await Promise.all(updates);
    }

    // Revalidate relevant pages
    revalidatePath("/admin/fines");
    revalidatePath("/admin/borrow-records");
    revalidatePath("/my-profile");

    return {
      success: true,
      message: `Processed ${overdueRecords.length} overdue books and created fines`,
      updatedCount: overdueRecords.length,
    };
  } catch (error) {
    console.error("Error checking overdue books and creating fines:", error);
    return {
      success: false,
      error: "An error occurred while processing overdue books",
    };
  }
}

/**
 * Check if a book has been lost (6+ weeks overdue) and create a lost fine
 */
export async function checkForLostBooks() {
  try {
    const now = new Date();
    const sixWeeksAgo = dayjs(now).subtract(6, "week").toDate();

    // Find books that are still borrowed/overdue and are 6+ weeks past due date
    const potentialLostBooks = await db
      .select({
        borrow: getTableColumns(borrowRecords),
        user: {
          fullname: users.fullname,
          email: users.email,
        },
        book: {
          title: books.title,
          author: books.author,
        },
      })
      .from(borrowRecords)
      .innerJoin(users, eq(borrowRecords.userId, users.id))
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .where(
        and(
          // Only BORROWED or OVERDUE books
          sql`${borrowRecords.status} IN ('BORROWED', 'OVERDUE')`,
          // Due date is more than 6 weeks ago
          sql`${borrowRecords.dueDate} < ${sixWeeksAgo}`
        )
      );

    if (potentialLostBooks.length === 0) {
      return {
        success: true,
        message: "No lost books found",
        updatedCount: 0,
      };
    }

    const updates = [];
    for (const item of potentialLostBooks) {
      // Set the book status to LOST
      updates.push(
        db
          .update(borrowRecords)
          .set({ status: "LOST" })
          .where(eq(borrowRecords.id, item.borrow.id))
      );

      // Create a LOST fine (assuming book value is 500 BDT, will be doubled)
      const lostFineAmount = 1000; // 2x the assumed value of 500 BDT

      updates.push(
        db.insert(fines).values({
          userId: item.borrow.userId,
          borrowRecordId: item.borrow.id,
          amount: lostFineAmount,
          fineType: "LOST",
          description: `Fine for lost book: "${item.book.title}" - 2x replacement cost`,
        })
      );

      // Send notification email
      try {
        await sendEmail({
          email: item.user.email,
          subject: `IMPORTANT: Book Marked as Lost - "${item.book.title}"`,
          message: `
            <div>
              <p>Dear ${item.user.fullname},</p>
              <p>The book <strong>"${item.book.title}"</strong> by ${item.book.author} that you borrowed has been overdue for more than 6 weeks and has been marked as <span style="color: red; font-weight: bold;">LOST</span>.</p>
              <p>According to the library policy, you have been assessed a fine of <strong>${lostFineAmount} BDT</strong> (twice the replacement cost).</p>
              <p>You have the following options:</p>
              <ol>
                <li>Return the book and pay the accumulated overdue fines instead</li>
                <li>Replace the book with a new copy of the same title</li>
                <li>Replace the book with the latest edition of the same title</li>
                <li>Pay the replacement cost fine</li>
              </ol>
              <p>Until this matter is resolved, your borrowing privileges remain suspended.</p>
              <p>Please contact the library circulation desk to discuss your options.</p>
            </div>
          `,
          plainText: false,
        });
      } catch (emailError) {
        console.error("Error sending lost book notification:", emailError);
        // Continue with success even if email fails
      }
    }

    // Execute all updates
    if (updates.length > 0) {
      await Promise.all(updates);
    }

    // Revalidate relevant pages
    revalidatePath("/admin/fines");
    revalidatePath("/admin/borrow-records");
    revalidatePath("/my-profile");

    return {
      success: true,
      message: `Marked ${potentialLostBooks.length} books as lost and created fines`,
      updatedCount: potentialLostBooks.length,
    };
  } catch (error) {
    console.error("Error checking for lost books:", error);
    return {
      success: false,
      error: "An error occurred while processing potentially lost books",
    };
  }
}

/**
 * Check if a user has any unpaid fines or overdue books
 */
export async function checkUserBorrowingEligibility(userId: string) {
  try {
    // Check for overdue books
    const overdueBooks = await db
      .select({ count: count() })
      .from(borrowRecords)
      .where(
        and(
          eq(borrowRecords.userId, userId),
          sql`${borrowRecords.status} IN ('OVERDUE', 'LOST')`
        )
      );

    // Check for unpaid fines
    const unpaidFines = await db
      .select({
        count: count(),
        totalAmount: sql<number>`COALESCE(SUM(${fines.amount}), 0)`,
      })
      .from(fines)
      .where(and(eq(fines.userId, userId), eq(fines.status, "PENDING")));

    const hasOverdueBooks = overdueBooks[0].count > 0;
    const hasUnpaidFines = unpaidFines[0].count > 0;
    const totalFines = unpaidFines[0].totalAmount || 0;

    // Get the current user status
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // If user has overdue books or unpaid fines, they are not eligible to borrow
    if (hasOverdueBooks || hasUnpaidFines) {
      // Don't update the status during the check - just return eligibility info
      return {
        isEligible: false,
        message: hasOverdueBooks
          ? "You have overdue books. Please return them to restore your borrowing privileges."
          : `You have unpaid fines totaling ${totalFines} BDT. Please pay them to restore your borrowing privileges.`,
        overdueCount: overdueBooks[0].count,
        fineCount: unpaidFines[0].count,
        totalFines,
        shouldBlock: user.length > 0 && user[0].status === "APPROVED",
      };
    }

    // User is eligible to borrow
    return {
      isEligible: true,
      message: "You are eligible to borrow books",
      overdueCount: 0,
      fineCount: 0,
      totalFines: 0,
      shouldUnblock: user.length > 0 && user[0].status === "BLOCKED",
    };
  } catch (error) {
    console.error("Error checking borrowing eligibility:", error);
    return {
      isEligible: false,
      message: "An error occurred while checking your borrowing eligibility",
      error: "Database error",
    };
  }
}

/**
 * Update user status based on eligibility
 * This should be called after checkUserBorrowingEligibility, but not during page render
 */
export async function updateUserBorrowingStatus(userId: string) {
  try {
    const eligibility = await checkUserBorrowingEligibility(userId);

    // If should block user
    if (!eligibility.isEligible && eligibility.shouldBlock) {
      await db
        .update(users)
        .set({ status: "BLOCKED" })
        .where(eq(users.id, userId));

      revalidatePath("/my-profile");
      return { success: true, action: "blocked" };
    }

    // If should unblock user
    if (eligibility.isEligible && eligibility.shouldUnblock) {
      await db
        .update(users)
        .set({ status: "APPROVED" })
        .where(eq(users.id, userId));

      revalidatePath("/my-profile");
      return { success: true, action: "unblocked" };
    }

    return { success: true, action: "none" };
  } catch (error) {
    console.error("Error updating user borrowing status:", error);
    return { success: false, error: "Failed to update user status" };
  }
}

/**
 * Get all fines for a user
 */
export async function getUserFines(userId: string) {
  try {
    const userFines = await db
      .select({
        fine: getTableColumns(fines),
        book: {
          title: books.title,
          author: books.author,
        },
        borrow: {
          borrowDate: borrowRecords.borrowDate,
          dueDate: borrowRecords.dueDate,
          returnDate: borrowRecords.returnDate,
          status: borrowRecords.status,
        },
      })
      .from(fines)
      .innerJoin(borrowRecords, eq(fines.borrowRecordId, borrowRecords.id))
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .where(eq(fines.userId, userId))
      .orderBy(desc(fines.createdAt));

    // Calculate total unpaid fines
    const unpaidFines = await db
      .select({
        totalAmount: sql<number>`COALESCE(SUM(${fines.amount}), 0)`,
      })
      .from(fines)
      .where(and(eq(fines.userId, userId), eq(fines.status, "PENDING")));

    return {
      success: true,
      data: JSON.parse(JSON.stringify(userFines)),
      totalUnpaid: unpaidFines[0].totalAmount || 0,
    };
  } catch (error) {
    console.error("Error getting user fines:", error);
    return {
      success: false,
      error: "An error occurred while retrieving your fines",
    };
  }
}

/**
 * Admin: Get all fines or filter by user/status
 */
export async function getAllFines({
  userId,
  status,
  page = 1,
  limit = 20,
}: {
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const offset = (page - 1) * limit;

    // Build where conditions based on filters
    const whereConditions = [];
    if (userId) {
      whereConditions.push(eq(fines.userId, userId));
    }
    if (status) {
      whereConditions.push(eq(fines.status, status.toUpperCase()));
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get fines with pagination
    const allFines = await db
      .select({
        fine: getTableColumns(fines),
        user: {
          fullname: users.fullname,
          email: users.email,
          universityId: users.universityId,
        },
        book: {
          title: books.title,
          author: books.author,
        },
        borrow: {
          borrowDate: borrowRecords.borrowDate,
          dueDate: borrowRecords.dueDate,
          returnDate: borrowRecords.returnDate,
          status: borrowRecords.status,
        },
      })
      .from(fines)
      .innerJoin(users, eq(fines.userId, users.id))
      .innerJoin(borrowRecords, eq(fines.borrowRecordId, borrowRecords.id))
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .where(whereClause)
      .orderBy(desc(fines.createdAt))
      .limit(limit)
      .offset(offset);

    // Count total fines for pagination
    const [totalCount] = await db
      .select({ count: count() })
      .from(fines)
      .where(whereClause);

    // Get total amounts
    const [totals] = await db
      .select({
        totalPending: sql<number>`COALESCE(SUM(CASE WHEN ${fines.status} = 'PENDING' THEN ${fines.amount} ELSE 0 END), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${fines.status} = 'PAID' THEN ${fines.amount} ELSE 0 END), 0)`,
        totalWaived: sql<number>`COALESCE(SUM(CASE WHEN ${fines.status} = 'WAIVED' THEN ${fines.amount} ELSE 0 END), 0)`,
        grandTotal: sql<number>`COALESCE(SUM(${fines.amount}), 0)`,
      })
      .from(fines)
      .where(whereClause);

    const totalPages = Math.ceil(totalCount.count / limit);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(allFines)),
      metadata: {
        currentPage: page,
        totalPages,
        totalCount: totalCount.count,
        hasNextPage: page < totalPages,
      },
      summary: {
        totalPending: totals.totalPending,
        totalPaid: totals.totalPaid,
        totalWaived: totals.totalWaived,
        grandTotal: totals.grandTotal,
      },
    };
  } catch (error) {
    console.error("Error getting all fines:", error);
    return {
      success: false,
      error: "An error occurred while retrieving fines",
    };
  }
}

/**
 * Admin: Mark a fine as paid
 */
export async function markFineAsPaid(fineId: string) {
  try {
    // Get fine details first
    const fineDetails = await db
      .select({
        fine: getTableColumns(fines),
        user: {
          fullname: users.fullname,
        },
        book: {
          title: books.title,
        },
      })
      .from(fines)
      .innerJoin(users, eq(fines.userId, users.id))
      .innerJoin(borrowRecords, eq(fines.borrowRecordId, borrowRecords.id))
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .where(eq(fines.id, fineId))
      .limit(1);

    if (fineDetails.length === 0) {
      return {
        success: false,
        error: "Fine not found",
      };
    }

    if (fineDetails[0].fine.status !== "PENDING") {
      return {
        success: false,
        error: `Fine has already been ${fineDetails[0].fine.status.toLowerCase()}`,
      };
    }

    // Update the fine status
    await db
      .update(fines)
      .set({
        status: "PAID",
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(fines.id, fineId));

    // Check if user has any other unpaid fines or overdue books
    const result = await checkUserBorrowingEligibility(
      fineDetails[0].fine.userId
    );

    // Send notification to user
    try {
      await sendEmail({
        email: fineDetails[0].user.email,
        subject: "Fine Payment Confirmed",
        message: `
          <div>
            <p>Dear ${fineDetails[0].user.fullname},</p>
            <p>We are confirming that your payment of <strong>${fineDetails[0].fine.amount} BDT</strong> for the fine related to the book "${fineDetails[0].book.title}" has been received and processed.</p>
            ${
              result.isEligible
                ? "<p>Your borrowing privileges have been restored. You can now borrow books from the library again.</p>"
                : "<p>However, you still have other outstanding fines or overdue books. Please settle these to restore your borrowing privileges.</p>"
            }
            <p>Thank you for your cooperation.</p>
          </div>
        `,
        plainText: false,
      });
    } catch (emailError) {
      console.error("Error sending fine payment confirmation:", emailError);
      // Continue with success even if email fails
    }

    // Revalidate relevant pages
    revalidatePath("/admin/fines");
    revalidatePath("/my-profile");

    return {
      success: true,
      message: "Fine marked as paid",
      borrowingRestored: result.isEligible,
    };
  } catch (error) {
    console.error("Error marking fine as paid:", error);
    return {
      success: false,
      error: "An error occurred while updating the fine status",
    };
  }
}

/**
 * Admin: Waive a fine
 */
export async function waiveFine({
  fineId,
  adminId,
  reason,
}: {
  fineId: string;
  adminId: string;
  reason: string;
}) {
  try {
    // Get fine details first
    const fineDetails = await db
      .select({
        fine: getTableColumns(fines),
        user: {
          fullname: users.fullname,
          email: users.email,
        },
        book: {
          title: books.title,
        },
      })
      .from(fines)
      .innerJoin(users, eq(fines.userId, users.id))
      .innerJoin(borrowRecords, eq(fines.borrowRecordId, borrowRecords.id))
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .where(eq(fines.id, fineId))
      .limit(1);

    if (fineDetails.length === 0) {
      return {
        success: false,
        error: "Fine not found",
      };
    }

    if (fineDetails[0].fine.status !== "PENDING") {
      return {
        success: false,
        error: `Fine has already been ${fineDetails[0].fine.status.toLowerCase()}`,
      };
    }

    // Update the fine description with the waive reason
    const updatedDescription = `${fineDetails[0].fine.description} - WAIVED: ${reason}`;

    // Update the fine status
    await db
      .update(fines)
      .set({
        status: "WAIVED",
        waivedAt: new Date(),
        waivedBy: adminId,
        updatedAt: new Date(),
        description: updatedDescription,
      })
      .where(eq(fines.id, fineId));

    // Check if user has any other unpaid fines or overdue books
    const result = await checkUserBorrowingEligibility(
      fineDetails[0].fine.userId
    );

    // Send notification to user
    try {
      await sendEmail({
        email: fineDetails[0].user.email,
        subject: "Fine Waived",
        message: `
          <div>
            <p>Dear ${fineDetails[0].user.fullname},</p>
            <p>We are pleased to inform you that your fine of <strong>${fineDetails[0].fine.amount} BDT</strong> for the book "${fineDetails[0].book.title}" has been waived.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            ${
              result.isEligible
                ? "<p>Your borrowing privileges have been restored. You can now borrow books from the library again.</p>"
                : "<p>However, you still have other outstanding fines or overdue books. Please settle these to restore your borrowing privileges.</p>"
            }
            <p>Thank you for your cooperation.</p>
          </div>
        `,
        plainText: false,
      });
    } catch (emailError) {
      console.error("Error sending fine waiver confirmation:", emailError);
      // Continue with success even if email fails
    }

    // Revalidate relevant pages
    revalidatePath("/admin/fines");
    revalidatePath("/my-profile");

    return {
      success: true,
      message: "Fine waived successfully",
      borrowingRestored: result.isEligible,
    };
  } catch (error) {
    console.error("Error waiving fine:", error);
    return {
      success: false,
      error: "An error occurred while waiving the fine",
    };
  }
}
