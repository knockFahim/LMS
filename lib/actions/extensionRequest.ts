"use server";

import { eq, and, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import dayjs from "dayjs";

import { db } from "@/database/drizzle";
import {
  extensionRequests,
  borrowRecords,
  books,
  users,
} from "@/database/schema";
import { sendEmail } from "@/lib/workflow";

// Create a new extension request
export async function createExtensionRequest(params: {
  borrowRecordId: string;
  userId: string;
  requestedDueDate: string;
  reason?: string;
}) {
  try {
    const { borrowRecordId, userId, requestedDueDate, reason } = params;

    // First, check if the borrow record exists and belongs to the user
    const borrowRecord = await db
      .select()
      .from(borrowRecords)
      .where(
        and(
          eq(borrowRecords.id, borrowRecordId),
          eq(borrowRecords.userId, userId),
          eq(borrowRecords.status, "BORROWED")
        )
      )
      .limit(1);

    if (!borrowRecord.length) {
      return {
        success: false,
        error: "Borrow record not found or not active",
      };
    }

    // Check if requested date is after current due date
    if (dayjs(requestedDueDate).isBefore(dayjs(borrowRecord[0].dueDate))) {
      return {
        success: false,
        error: "Requested due date must be after the current due date",
      };
    }

    // Check how many extension requests the user has made this month
    const startOfMonth = dayjs().startOf("month").toDate();
    const monthlyRequestsCount = await db
      .select({ count: count() })
      .from(extensionRequests)
      .where(
        and(
          eq(extensionRequests.userId, userId),
          eq(extensionRequests.status, "APPROVED")
        )
      )
      .where((borrowRecords) => borrowRecords.requestDate >= startOfMonth);

    if (monthlyRequestsCount[0].count >= 2) {
      return {
        success: false,
        error: "You have already used your 2 extension requests for this month",
      };
    }

    // Check if there's already a pending request for this borrow record
    const existingRequest = await db
      .select()
      .from(extensionRequests)
      .where(
        and(
          eq(extensionRequests.borrowRecordId, borrowRecordId),
          eq(extensionRequests.status, "PENDING")
        )
      )
      .limit(1);

    if (existingRequest.length) {
      return {
        success: false,
        error: "You already have a pending extension request for this book",
      };
    }

    // Create the extension request
    const newRequest = await db
      .insert(extensionRequests)
      .values({
        borrowRecordId,
        userId,
        currentDueDate: borrowRecord[0].dueDate,
        requestedDueDate: new Date(requestedDueDate),
        reason: reason || null,
      })
      .returning();

    // Get book details for notification
    const bookDetails = await db
      .select({
        title: books.title,
        id: books.id,
      })
      .from(books)
      .innerJoin(borrowRecords, eq(borrowRecords.bookId, books.id))
      .where(eq(borrowRecords.id, borrowRecordId))
      .limit(1);

    if (bookDetails.length) {
      // Notify admin about the extension request
      const admins = await db
        .select({
          email: users.email,
          fullname: users.fullname,
        })
        .from(users)
        .where(eq(users.role, "ADMIN"));

      if (admins.length) {
        // Send notification to first admin (could be modified to send to all admins)
        const admin = admins[0];

        // Send email notification
        await sendEmail({
          email: admin.email,
          subject: "New Due Date Extension Request",
          message: `
            <div>
              <p>Hello ${admin.fullname},</p>
              <p>A new due date extension request has been submitted.</p>
              <p><strong>Book:</strong> ${bookDetails[0].title}</p>
              <p><strong>Current Due Date:</strong> ${dayjs(borrowRecord[0].dueDate).format("MMMM D, YYYY")}</p>
              <p><strong>Requested Due Date:</strong> ${dayjs(requestedDueDate).format("MMMM D, YYYY")}</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
              <p>Please review this request in the admin dashboard.</p>
            </div>
          `,
          plainText: false,
        });
      }
    }

    revalidatePath("/my-profile");

    return {
      success: true,
      data: newRequest[0],
    };
  } catch (error) {
    console.error("Error creating extension request:", error);
    return {
      success: false,
      error: "Failed to create extension request",
    };
  }
}

// Get extension requests for a specific user
export async function getUserExtensionRequests(userId: string) {
  try {
    const requests = await db
      .select({
        extension: {
          id: extensionRequests.id,
          status: extensionRequests.status,
          currentDueDate: extensionRequests.currentDueDate,
          requestedDueDate: extensionRequests.requestedDueDate,
          reason: extensionRequests.reason,
          adminNote: extensionRequests.adminNote,
          createdAt: extensionRequests.createdAt,
        },
        book: {
          id: books.id,
          title: books.title,
          author: books.author,
          coverUrl: books.coverUrl,
          coverColor: books.coverColor,
        },
        borrow: {
          id: borrowRecords.id,
        },
      })
      .from(extensionRequests)
      .innerJoin(
        borrowRecords,
        eq(extensionRequests.borrowRecordId, borrowRecords.id)
      )
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .where(eq(extensionRequests.userId, userId))
      .orderBy(extensionRequests.createdAt);

    return {
      success: true,
      data: requests,
    };
  } catch (error) {
    console.error("Error fetching user extension requests:", error);
    return {
      success: false,
      error: "Failed to fetch extension requests",
    };
  }
}

// Admin: Update an extension request status
export async function updateExtensionRequestStatus({
  requestId,
  status,
  adminNote,
}: {
  requestId: string;
  status: "APPROVED" | "REJECTED";
  adminNote?: string;
}) {
  try {
    // Get the extension request details
    const existingRequest = await db
      .select()
      .from(extensionRequests)
      .where(eq(extensionRequests.id, requestId))
      .limit(1);

    if (!existingRequest.length) {
      return {
        success: false,
        error: "Extension request not found",
      };
    }

    const request = existingRequest[0];

    // Update the request status
    const updatedRequest = await db
      .update(extensionRequests)
      .set({
        status: status,
        adminNote: adminNote || null,
        updatedAt: new Date(),
      })
      .where(eq(extensionRequests.id, requestId))
      .returning();

    // If approved, update the borrow record's due date
    if (status === "APPROVED") {
      await db
        .update(borrowRecords)
        .set({
          dueDate: request.requestedDueDate,
        })
        .where(eq(borrowRecords.id, request.borrowRecordId));
    }

    // Get user and book details for notification
    const [userData, bookData] = await Promise.all([
      db
        .select({
          fullname: users.fullname,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, request.userId))
        .limit(1),
      db
        .select({
          title: books.title,
        })
        .from(books)
        .innerJoin(borrowRecords, eq(borrowRecords.bookId, books.id))
        .where(eq(borrowRecords.id, request.borrowRecordId))
        .limit(1),
    ]);

    // Send notification to the user
    if (userData.length && bookData.length) {
      const user = userData[0];
      const book = bookData[0];

      const statusText = status === "APPROVED" ? "approved" : "rejected";
      const statusColor = status === "APPROVED" ? "#027A48" : "#EF3A4B";

      await sendEmail({
        email: user.email,
        subject: `Due Date Extension Request ${statusText.toUpperCase()}`,
        message: `
          <div>
            <p>Hello ${user.fullname},</p>
            <p>Your request to extend the due date for <strong>${book.title}</strong> has been <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>.</p>
            
            ${
              status === "APPROVED"
                ? `<p>Your new due date is <strong>${dayjs(request.requestedDueDate).format("MMMM D, YYYY")}</strong>.</p>`
                : `<p>The current due date <strong>${dayjs(request.currentDueDate).format("MMMM D, YYYY")}</strong> remains in effect.</p>`
            }
            
            ${adminNote ? `<p><strong>Admin Note:</strong> ${adminNote}</p>` : ""}
            
            <p>Thank you for using the Brac University Library.</p>
          </div>
        `,
        plainText: false,
      });
    }

    // Revalidate relevant paths
    revalidatePath("/admin/extension-requests");
    revalidatePath("/my-profile");

    return {
      success: true,
      data: updatedRequest[0],
    };
  } catch (error) {
    console.error("Error updating extension request:", error);
    return {
      success: false,
      error: "Failed to update extension request status",
    };
  }
}

// Admin: Get all extension requests
export async function getAllExtensionRequests(params: {
  page?: number;
  limit?: number;
  sort?: string;
  query?: string;
  status?: string;
}) {
  try {
    const { page = 1, limit = 20, status } = params;
    const offset = (page - 1) * limit;

    // Build the query
    let query = db
      .select({
        extension: {
          id: extensionRequests.id,
          status: extensionRequests.status,
          currentDueDate: extensionRequests.currentDueDate,
          requestedDueDate: extensionRequests.requestedDueDate,
          reason: extensionRequests.reason,
          adminNote: extensionRequests.adminNote,
          createdAt: extensionRequests.createdAt,
          updatedAt: extensionRequests.updatedAt,
        },
        user: {
          id: users.id,
          fullname: users.fullname,
          email: users.email,
        },
        book: {
          id: books.id,
          title: books.title,
          author: books.author,
          coverUrl: books.coverUrl,
          coverColor: books.coverColor,
        },
        borrow: {
          id: borrowRecords.id,
          dueDate: borrowRecords.dueDate,
        },
      })
      .from(extensionRequests)
      .innerJoin(users, eq(extensionRequests.userId, users.id))
      .innerJoin(
        borrowRecords,
        eq(extensionRequests.borrowRecordId, borrowRecords.id)
      )
      .innerJoin(books, eq(borrowRecords.bookId, books.id));

    // Apply status filter if provided
    if (status) {
      query = query.where(eq(extensionRequests.status, status.toUpperCase()));
    }

    // Get the data with pagination
    const [requests, countResult] = await Promise.all([
      query.orderBy(extensionRequests.createdAt).limit(limit).offset(offset),
      db
        .select({ count: count() })
        .from(extensionRequests)
        .where(
          status
            ? eq(extensionRequests.status, status.toUpperCase())
            : undefined
        ),
    ]);

    const totalCount = Number(countResult[0]?.count) || 0;
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;

    return {
      success: true,
      data: requests,
      metadata: {
        totalPages,
        hasNextPage,
        totalCount,
        currentPage: page,
      },
    };
  } catch (error) {
    console.error("Error fetching extension requests:", error);
    return {
      success: false,
      error: "Failed to fetch extension requests",
    };
  }
}
