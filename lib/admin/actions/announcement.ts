"use server";

import { eq, desc, and, or, count, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/database/drizzle";
import { announcements, users } from "@/database/schema";
import { sendEmail } from "@/lib/workflow";

const ITEMS_PER_PAGE = 10;

export type AnnouncementParams = {
  title: string;
  content: string;
  createdBy: string;
  expiresAt?: string;
  sendEmail?: boolean;
};

// Helper function to send announcement emails
async function sendAnnouncementEmails(title: string, content: string) {
  try {
    // Get all users with approved status
    const allUsers = await db
      .select({
        email: users.email,
        fullname: users.fullname,
      })
      .from(users)
      .where(eq(users.status, "APPROVED"));

    // Prepare the HTML content
    const announcementEmailContent = `
      <div>
        <p>Dear Library User,</p>
        <p>An important announcement has been published in the Library Management System:</p>
        
        <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #1c1f40; background-color: #f8f9fa;">
          <h2 style="margin-top: 0; color: #1c1f40;">${title}</h2>
          <p>${content}</p>
        </div>
        
        <p>To view all announcements, please log into your account.</p>
        
        <p>Thank you for using the Brac University Library.</p>
        
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://library.bracu.ac.bd"}" class="button">Visit Library Portal</a></p>
      </div>
    `;

    // Send emails to all users (in batches to prevent overwhelming the email service)
    const batchSize = 50;
    for (let i = 0; i < allUsers.length; i += batchSize) {
      const batch = allUsers.slice(i, i + batchSize);

      await Promise.all(
        batch.map((user) =>
          sendEmail({
            email: user.email,
            subject: `Library Announcement: ${title}`,
            message: announcementEmailContent,
            plainText: false,
          })
        )
      );
    }

    console.log(`Announcement emails sent to ${allUsers.length} users`);
    return true;
  } catch (error) {
    console.error("Error sending announcement emails:", error);
    return false;
  }
}

// Create a new announcement
export async function createAnnouncement(params: AnnouncementParams) {
  try {
    const {
      title,
      content,
      createdBy,
      expiresAt,
      sendEmail: shouldSendEmail = false,
    } = params;

    const newAnnouncement = await db
      .insert(announcements)
      .values({
        title,
        content,
        createdBy,
        isActive: true, // Explicitly set to true
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      })
      .returning();

    // If sendEmail is true, send notification to all users
    if (shouldSendEmail) {
      await sendAnnouncementEmails(title, content);
    }

    revalidatePath("/admin/announcements");
    revalidatePath("/");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(newAnnouncement[0])),
    };
  } catch (error) {
    console.error("Error creating announcement:", error);
    return {
      success: false,
      error: "Error creating announcement",
    };
  }
}

// Get all announcements with pagination
export async function getAnnouncements({
  page = 1,
  limit = ITEMS_PER_PAGE,
  activeOnly = false,
}: {
  page?: number;
  limit?: number;
  activeOnly?: boolean;
}) {
  try {
    // Calculate the current date in UTC
    const now = new Date();

    // First, try to get everything without filtering
    const query = db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    // Only if activeOnly is true, apply filters after getting data
    let announcementsData = await query;

    if (activeOnly) {
      // Filter in JavaScript after fetching from DB
      announcementsData = announcementsData.filter((announcement) => {
        // Check if expiresAt is null or in the future
        const notExpired =
          !announcement.expiresAt || new Date(announcement.expiresAt) > now;

        // Try various checks that might match depending on how boolean is stored
        return (
          notExpired &&
          (announcement.isActive === true ||
            announcement.isActive === 1 ||
            announcement.isActive === "true" ||
            announcement.isActive === "t" ||
            announcement.isActive === "1" ||
            announcement.isActive === "yes")
        );
      });
    }

    // Count total for pagination
    const totalItems = await db.select({ count: count() }).from(announcements);

    const totalCount = totalItems[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;

    return {
      success: true,
      data: announcementsData,
      metadata: {
        totalPages,
        hasNextPage,
      },
    };
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return {
      success: false,
      error: "An error occurred while fetching announcements",
    };
  }
}

// Update announcement status (active/inactive)
export async function updateAnnouncementStatus({
  id,
  isActive,
  sendEmail: shouldSendEmail = false,
}: {
  id: string;
  isActive: boolean;
  sendEmail?: boolean;
}) {
  try {
    const updatedAnnouncement = await db
      .update(announcements)
      .set({ isActive })
      .where(eq(announcements.id, id))
      .returning();

    // If activating an announcement and sendEmail is true, send notification
    if (isActive && shouldSendEmail && updatedAnnouncement.length > 0) {
      const { title, content } = updatedAnnouncement[0];
      await sendAnnouncementEmails(title, content);
    }

    revalidatePath("/admin/announcements");
    revalidatePath("/");

    return {
      success: true,
      data: updatedAnnouncement[0],
    };
  } catch (error) {
    console.error("Error updating announcement status:", error);
    return {
      success: false,
      error: "An error occurred while updating announcement status",
    };
  }
}

// Delete an announcement
export async function deleteAnnouncement(id: string) {
  try {
    await db.delete(announcements).where(eq(announcements.id, id));

    revalidatePath("/admin/announcements");
    revalidatePath("/");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return {
      success: false,
      error: "An error occurred while deleting the announcement",
    };
  }
}

// Get announcement by ID
export async function getAnnouncementById(id: string) {
  try {
    const announcement = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id))
      .limit(1);

    if (announcement.length === 0) {
      return {
        success: false,
        error: "Announcement not found",
      };
    }

    return {
      success: true,
      data: announcement[0],
    };
  } catch (error) {
    console.error("Error fetching announcement:", error);
    return {
      success: false,
      error: "An error occurred while fetching the announcement",
    };
  }
}
