"use server";

import { revalidatePath } from "next/cache";
import { or, desc, asc, count, eq, ilike, and } from "drizzle-orm";

import { db } from "@/database/drizzle";
import { borrowRecords, users } from "@/database/schema";
import { sendEmail } from "@/lib/workflow";

const ITEMS_PER_PAGE = 20;

export async function getUsers({
  query,
  sort = "available",
  page = 1,
  limit = ITEMS_PER_PAGE,
}: QueryParams) {
  try {
    console.log("User search params:", { query, sort, page, limit });

    // If there's a search query, create appropriate search conditions
    let searchConditions;

    if (query && query.trim() !== "") {
      // Create case-insensitive search matching fullname or email
      searchConditions = or(
        ilike(users.fullname, `%${query}%`),
        ilike(users.email, `%${query}%`)
      );
    }

    const sortOptions: Record<string, any> = {
      newest: desc(users.createdAt),
      oldest: asc(users.createdAt),
    };

    const sortingCondition = sortOptions[sort] || desc(users.createdAt);

    const usersData = await db
      .select({
        user: users,
        totalBorrowedBooks: count(borrowRecords.id).as("totalBorrowedBooks"),
      })
      .from(users)
      .leftJoin(
        borrowRecords,
        eq(borrowRecords.userId, users.id) // Match borrow records to users.
      )
      .where(searchConditions)
      .groupBy(users.id) // Group by user to get borrow counts.
      .orderBy(sortingCondition)
      .limit(limit)
      .offset((page - 1) * limit);

    const totalItems = await db
      .select({
        count: count(users.id),
      })
      .from(users)
      .where(searchConditions);

    const totalPages = Math.ceil(totalItems[0].count / ITEMS_PER_PAGE);
    const hasNextPage = page < totalPages;

    return {
      success: true,
      data: usersData,
      metadata: {
        totalPages,
        hasNextPage,
      },
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    return {
      success: false,
      error: "An error occurred while fetching users",
    };
  }
}

export async function updateAccountStatus(params: UpdateAccountStatusParams) {
  const { userId, status } = params;

  try {
    const updatedUser = await db
      .update(users)
      .set({ status })
      .where(eq(users.id, userId))
      .returning();

    revalidatePath("/admin/account-requests");
    return {
      success: true,
      data: updatedUser,
    };
  } catch (error) {
    console.error("Error updating user status:", error);
    return {
      success: false,
      error: "An error occurred while updating user status",
    };
  }
}

export async function updateUserRole(params: { userId: string; role: string }) {
  const { userId, role } = params;

  try {
    const updatedUser = await db
      .update(users)
      .set({ role: role.toUpperCase() }) // Convert to uppercase to match the enum values
      .where(eq(users.id, userId))
      .returning();

    // Send email notification for role change
    if (updatedUser.length > 0) {
      const { email, fullname } = updatedUser[0];
      const formattedRole =
        role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

      const roleChangeMessage = `
        <div>
          <p>Hi ${fullname},</p>
          <p>Your account role has been updated to <strong>${formattedRole}</strong> in the Brac University Library system.</p>
          
          ${
            role.toLowerCase() === "admin"
              ? `
            <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #1c1f40; margin: 20px 0;">
              <p><strong>As an Admin, you now have access to:</strong></p>
              <ul>
                <li>User management</li>
                <li>Book inventory management</li>
                <li>Borrow records</li>
                <li>Account request approvals</li>
                <li>Announcement creation and management</li>
              </ul>
            </div>
            
            <p>You can access the admin dashboard by logging in and visiting the admin section.</p>
          `
              : ""
          }
          
          <p>If you have any questions about your new role or permissions, please contact the library administration.</p>
          
          <p>Thank you for being part of our library community!</p>
        </div>
      `;

      await sendEmail({
        email,
        subject: `Your Library Account Role Has Been Updated to ${formattedRole}`,
        message: roleChangeMessage,
        plainText: false,
      });
    }

    revalidatePath("/admin/users");
    return {
      success: true,
      data: updatedUser,
    };
  } catch (error) {
    console.error("Error updating user role:", error);
    return {
      success: false,
      error: "An error occurred while updating user role",
    };
  }
}

export async function deleteUser(userId: string) {
  try {
    // First check if the user has any borrowed books
    const borrowedBooks = await db
      .select({ count: count() })
      .from(borrowRecords)
      .where(
        and(
          eq(borrowRecords.userId, userId),
          eq(borrowRecords.status, "BORROWED")
        )
      );
    
    if (borrowedBooks[0].count > 0) {
      return {
        success: false,
        error:
          "Cannot delete user with borrowed books. Please ensure all books are returned first.",
      };
    }
    
    // Delete the user
    const deletedUser = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning();
      
    if (deletedUser.length === 0) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Revalidate the users page to update the UI
    revalidatePath("/admin/users");
    
    return {
      success: true,
      message: "User deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting user:", error);
    return {
      success: false,
      error: "An error occurred while deleting the user",
    };
  }
}
