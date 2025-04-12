"use server";

import { count, desc, eq, getTableColumns, ilike, or } from "drizzle-orm";

import { db } from "@/database/drizzle";
import { bookRequests, users } from "@/database/schema";
import { sendEmail } from "../workflow";

const ITEMS_PER_PAGE = 20;

export async function createBookRequest(params: BookRequestParams) {
  const { userId, title, author, genre, description } = params;

  try {
    console.log("Received book request params:", {
      userId,
      title,
      author,
      genre,
      description,
    });

    // Create the book request in the database - explicitly handle optional fields and set updatedAt
    const currentTime = new Date();
    const bookRequest = await db
      .insert(bookRequests)
      .values({
        userId,
        title,
        author: author || null,
        genre: genre || null,
        description: description || null,
        createdAt: currentTime,
        updatedAt: currentTime,
      })
      .returning();

    console.log("Book request created successfully:", bookRequest[0]);

    // Get user's email to send confirmation
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Send confirmation email to the user
    if (user.length > 0) {
      try {
        const confirmationMessage = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Book Request Received</h2>
            <p>Hello ${user[0].fullname},</p>
            <p>Thank you for requesting the book <strong>${title}</strong>.</p>
            <p>Our library team will review your request and let you know when this title becomes available.</p>
            <p>You can check the status of your request in your profile.</p>
            <p>Thank you for using our library services!</p>
            <p>Best regards,<br>Brac University Library</p>
          </div>
        `;

        await sendEmail({
          email: user[0].email,
          subject: `Book Request: ${title} - Received`,
          message: confirmationMessage,
          plainText: false,
        });
      } catch (emailError) {
        console.error(
          "Error sending book request confirmation email:",
          emailError
        );
        // Continue with success even if email sending fails
      }
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(bookRequest[0])),
    };
  } catch (error) {
    console.error("Error creating book request:", error);
    return {
      success: false,
      error: "Failed to submit book request. Please try again.",
    };
  }
}

export async function getUserBookRequests(userId: string) {
  try {
    const requests = await db
      .select()
      .from(bookRequests)
      .where(eq(bookRequests.userId, userId))
      .orderBy(desc(bookRequests.createdAt));

    return {
      success: true,
      data: JSON.parse(JSON.stringify(requests)),
    };
  } catch (error) {
    console.error("Error fetching user book requests:", error);
    return {
      success: false,
      error: "Failed to fetch your book requests.",
    };
  }
}

export async function getBookRequests({
  query,
  page = 1,
  limit = ITEMS_PER_PAGE,
}) {
  try {
    console.log("Fetching book requests with params:", { query, page, limit });

    const searchConditions = query
      ? or(
          ilike(bookRequests.title, `%${query}%`),
          ilike(bookRequests.author, `%${query}%`),
          ilike(bookRequests.genre, `%${query}%`)
        )
      : undefined;

    try {
      const [requests, totalItems] = await Promise.all([
        db
          .select({
            ...getTableColumns(bookRequests),
            user: {
              ...getTableColumns(users),
            },
          })
          .from(bookRequests)
          .leftJoin(users, eq(bookRequests.userId, users.id))
          .where(searchConditions)
          .orderBy(desc(bookRequests.createdAt))
          .limit(limit)
          .offset((page - 1) * limit),

        db
          .select({ count: count() })
          .from(bookRequests)
          .where(searchConditions),
      ]);

      console.log(`Found ${requests.length} book requests`);

      const totalPages = Math.ceil(totalItems[0].count / limit);
      const hasNextPage = page < totalPages;

      return {
        success: true,
        data: requests,
        metadata: {
          totalPages,
          hasNextPage,
          totalCount: totalItems[0].count,
          currentPage: page,
        },
      };
    } catch (dbError) {
      console.error("Database error when fetching book requests:", dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }
  } catch (error) {
    console.error("Error fetching book requests:", error);
    return {
      success: false,
      error: "Failed to fetch book requests. Database connection issue.",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function updateBookRequestStatus({
  requestId,
  status,
  adminNote,
}: {
  requestId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote?: string;
}) {
  try {
    const updatedRequest = await db
      .update(bookRequests)
      .set({
        status,
        adminNote: adminNote || null,
        updatedAt: new Date(),
      })
      .where(eq(bookRequests.id, requestId))
      .returning();

    if (!updatedRequest.length) {
      return {
        success: false,
        error: "Book request not found",
      };
    }

    // Get the user's email to send notification
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, updatedRequest[0].userId))
      .limit(1);

    if (user.length > 0) {
      try {
        const statusMessage =
          status === "APPROVED"
            ? "We're pleased to inform you that your book request has been approved! We will notify you once the book is available in our library."
            : status === "REJECTED"
              ? "We regret to inform you that your book request has been declined at this time."
              : "Your book request is currently under review.";

        const adminNoteMessage = adminNote
          ? `<p><strong>Note from the librarian:</strong> ${adminNote}</p>`
          : "";

        const emailMessage = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Book Request Status Update</h2>
            <p>Hello ${user[0].fullname},</p>
            <p>${statusMessage}</p>
            <p><strong>Book Title:</strong> ${updatedRequest[0].title}</p>
            ${adminNoteMessage}
            <p>Thank you for using our library services!</p>
            <p>Best regards,<br>Brac University Library</p>
          </div>
        `;

        await sendEmail({
          email: user[0].email,
          subject: `Book Request Status Update: ${updatedRequest[0].title}`,
          message: emailMessage,
          plainText: false,
        });
      } catch (emailError) {
        console.error(
          "Error sending book request status update email:",
          emailError
        );
        // Continue with success even if email sending fails
      }
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(updatedRequest[0])),
    };
  } catch (error) {
    console.error("Error updating book request status:", error);
    return {
      success: false,
      error: "Failed to update book request status.",
    };
  }
}
