"use server";

import { and, count, desc, eq, getTableColumns, ilike, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/database/drizzle";
import { libraryMessages, users } from "@/database/schema";
import { sendEmail } from "@/lib/workflow";

const ITEMS_PER_PAGE = 20;

// Create a new library message (ask librarian)
export async function createLibraryMessage(params: {
  userId: string;
  subject: string;
  message: string;
}) {
  try {
    const { userId, subject, message } = params;

    const newMessage = await db
      .insert(libraryMessages)
      .values({
        userId,
        subject,
        message,
        status: "UNREAD",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Get admin emails to notify about new message
    const admins = await db
      .select({
        email: users.email,
        fullname: users.fullname,
      })
      .from(users)
      .where(eq(users.role, "ADMIN"));

    // Get user details
    const user = await db
      .select({
        email: users.email,
        fullname: users.fullname,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length && admins.length) {
      // Send notification to admins
      try {
        const adminNotification = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Library Message Received</h2>
            <p>Hello Admin,</p>
            <p>A new message has been submitted to the library by <strong>${user[0].fullname}</strong>.</p>
            
            <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #1c1f40; background-color: #f8f9fa;">
              <h3 style="margin-top: 0; color: #1c1f40;">Subject: ${subject}</h3>
              <p>${message}</p>
            </div>
            
            <p>Please log into the admin dashboard to respond to this message.</p>
            <p>Thank you for your attention to this matter.</p>
          </div>
        `;

        // Send to the first admin (could be modified to send to all admins if needed)
        await sendEmail({
          email: admins[0].email,
          subject: `New Library Message: ${subject}`,
          message: adminNotification,
          plainText: false,
        });
      } catch (emailError) {
        console.error("Error sending admin notification:", emailError);
        // Non-critical error, continue with the process
      }

      // Send confirmation to user
      try {
        const userConfirmation = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Message Received</h2>
            <p>Hello ${user[0].fullname},</p>
            <p>We have received your message to the library.</p>
            
            <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #1c1f40; background-color: #f8f9fa;">
              <h3 style="margin-top: 0; color: #1c1f40;">Subject: ${subject}</h3>
              <p>${message}</p>
            </div>
            
            <p>A librarian will review your message and respond to you as soon as possible. You can check for responses in the "Ask Librarian" section of your account.</p>
            <p>Thank you for contacting the Brac University Library.</p>
          </div>
        `;

        await sendEmail({
          email: user[0].email,
          subject: `Library Message Received: ${subject}`,
          message: userConfirmation,
          plainText: false,
        });
      } catch (emailError) {
        console.error("Error sending user confirmation:", emailError);
        // Non-critical error, continue with the process
      }
    }

    revalidatePath("/ask-librarian");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(newMessage[0])),
    };
  } catch (error) {
    console.error("Error creating library message:", error);
    return {
      success: false,
      error: "Failed to submit your message. Please try again.",
    };
  }
}

// Get library messages for a specific user
export async function getUserLibraryMessages(userId: string) {
  try {
    const messages = await db
      .select()
      .from(libraryMessages)
      .where(eq(libraryMessages.userId, userId))
      .orderBy(desc(libraryMessages.createdAt));

    return {
      success: true,
      data: JSON.parse(JSON.stringify(messages)),
    };
  } catch (error) {
    console.error("Error fetching user library messages:", error);
    return {
      success: false,
      error: "Failed to fetch your messages.",
    };
  }
}

// Admin: Get all library messages with pagination and filtering
export async function getLibraryMessages({
  query,
  page = 1,
  limit = ITEMS_PER_PAGE,
  status,
}: {
  query?: string;
  page?: number;
  limit?: number;
  status?: string;
}) {
  try {
    const offset = (page - 1) * limit;

    // Build search conditions
    let searchConditions;
    if (query) {
      searchConditions = or(
        ilike(libraryMessages.subject, `%${query}%`),
        ilike(libraryMessages.message, `%${query}%`)
      );
    }

    // Add status filter if provided
    if (status) {
      const statusCondition = eq(libraryMessages.status, status.toUpperCase());
      searchConditions = searchConditions
        ? and(searchConditions, statusCondition)
        : statusCondition;
    }

    const [messages, totalItems] = await Promise.all([
      db
        .select({
          ...getTableColumns(libraryMessages),
          user: {
            id: users.id,
            fullname: users.fullname,
            email: users.email,
          },
        })
        .from(libraryMessages)
        .leftJoin(users, eq(libraryMessages.userId, users.id))
        .where(searchConditions)
        .orderBy(desc(libraryMessages.createdAt))
        .limit(limit)
        .offset(offset),

      db
        .select({ count: count() })
        .from(libraryMessages)
        .where(searchConditions),
    ]);

    const totalCount = Number(totalItems[0]?.count) || 0;
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;

    return {
      success: true,
      data: messages,
      metadata: {
        totalPages,
        hasNextPage,
        totalCount,
        currentPage: page,
      },
    };
  } catch (error) {
    console.error("Error fetching library messages:", error);
    return {
      success: false,
      error: "Failed to fetch messages.",
    };
  }
}

// Admin: Reply to a library message
export async function replyToLibraryMessage({
  messageId,
  adminId,
  adminResponse,
}: {
  messageId: string;
  adminId: string;
  adminResponse: string;
}) {
  try {
    const message = await db
      .select()
      .from(libraryMessages)
      .where(eq(libraryMessages.id, messageId))
      .limit(1);

    if (!message.length) {
      return {
        success: false,
        error: "Message not found",
      };
    }

    const updatedMessage = await db
      .update(libraryMessages)
      .set({
        adminResponse,
        adminId,
        status: "REPLIED",
        updatedAt: new Date(),
      })
      .where(eq(libraryMessages.id, messageId))
      .returning();

    // Get user email to send notification
    const [user, admin] = await Promise.all([
      db.select().from(users).where(eq(users.id, message[0].userId)).limit(1),
      db.select().from(users).where(eq(users.id, adminId)).limit(1),
    ]);

    if (user.length && admin.length) {
      try {
        const responseNotification = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Response to Your Library Message</h2>
            <p>Hello ${user[0].fullname},</p>
            <p>A librarian has responded to your message.</p>
            
            <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #1c1f40; background-color: #f8f9fa;">
              <h3 style="margin-top: 0; color: #1c1f40;">Your Question: ${message[0].subject}</h3>
              <p>${message[0].message}</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
              <h3 style="margin-top: 0; color: #1c1f40;">Librarian's Response:</h3>
              <p>${adminResponse}</p>
              <p style="margin-top: 15px; font-style: italic;">Responded by: ${admin[0].fullname}</p>
            </div>
            
            <p>If you have any further questions, please feel free to send another message through the "Ask Librarian" feature.</p>
            <p>Thank you for using the Brac University Library.</p>
          </div>
        `;

        await sendEmail({
          email: user[0].email,
          subject: `Library Response: ${message[0].subject}`,
          message: responseNotification,
          plainText: false,
        });
      } catch (emailError) {
        console.error("Error sending response notification:", emailError);
        // Non-critical error, continue with the process
      }
    }

    revalidatePath("/admin/library-messages");
    revalidatePath("/ask-librarian");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(updatedMessage[0])),
    };
  } catch (error) {
    console.error("Error replying to library message:", error);
    return {
      success: false,
      error: "Failed to send your response. Please try again.",
    };
  }
}

// Admin: Mark a message as read
export async function markMessageAsRead(messageId: string) {
  try {
    // Only update if status is currently UNREAD
    const message = await db
      .select()
      .from(libraryMessages)
      .where(eq(libraryMessages.id, messageId))
      .limit(1);

    if (!message.length || message[0].status !== "UNREAD") {
      return {
        success: false,
        error: message.length ? "Message is not unread" : "Message not found",
      };
    }

    const updatedMessage = await db
      .update(libraryMessages)
      .set({
        status: "READ",
        updatedAt: new Date(),
      })
      .where(eq(libraryMessages.id, messageId))
      .returning();

    revalidatePath("/admin/library-messages");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(updatedMessage[0])),
    };
  } catch (error) {
    console.error("Error marking message as read:", error);
    return {
      success: false,
      error: "Failed to update message status.",
    };
  }
}
