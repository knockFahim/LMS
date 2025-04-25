"use server";

import { and, count, desc, eq, getTableColumns } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/database/drizzle";
import { reviews, borrowRecords, users, books } from "@/database/schema";

interface CreateReviewParams {
  bookId: string;
  userId: string;
  rating: number;
  comment?: string;
}

/**
 * Checks if a user has borrowed and returned a specific book.
 */
export async function canUserReviewBook(userId: string, bookId: string) {
  try {
    const borrowRecord = await db
      .select({ count: count() })
      .from(borrowRecords)
      .where(
        and(
          eq(borrowRecords.userId, userId),
          eq(borrowRecords.bookId, bookId),
          eq(borrowRecords.status, "RETURNED")
        )
      );

    return {
      success: true,
      canReview: borrowRecord[0].count > 0,
    };
  } catch (error) {
    console.error("Error checking review eligibility:", error);
    return { success: false, canReview: false, error: "Database error" };
  }
}

/**
 * Checks if a user has already reviewed a specific book.
 */
export async function hasUserReviewedBook(userId: string, bookId: string) {
  try {
    const existingReview = await db
      .select({ count: count() })
      .from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.bookId, bookId)));

    return {
      success: true,
      hasReviewed: existingReview[0].count > 0,
    };
  } catch (error) {
    console.error("Error checking existing review:", error);
    return { success: false, hasReviewed: true, error: "Database error" }; // Default to true to prevent multiple reviews on error
  }
}

/**
 * Creates a new review for a book.
 */
export async function createReview(params: CreateReviewParams) {
  const { userId, bookId, rating, comment } = params;

  try {
    // 1. Verify eligibility: User must have borrowed and returned the book
    const eligibility = await canUserReviewBook(userId, bookId);
    if (!eligibility.success || !eligibility.canReview) {
      return {
        success: false,
        error: "You must borrow and return the book before reviewing it.",
      };
    }

    // 2. Check if user has already reviewed this book
    const reviewedStatus = await hasUserReviewedBook(userId, bookId);
    if (!reviewedStatus.success || reviewedStatus.hasReviewed) {
      return {
        success: false,
        error: "You have already reviewed this book.",
      };
    }

    // 3. Create the review
    const newReview = await db
      .insert(reviews)
      .values({
        userId,
        bookId,
        rating,
        comment: comment || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Revalidate book detail paths for both user and admin
    revalidatePath(`/books/${bookId}`);
    revalidatePath(`/admin/books/${bookId}`);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(newReview[0])),
    };
  } catch (error) {
    console.error("Error creating review:", error);
    return {
      success: false,
      error: "Failed to submit review. Please try again.",
    };
  }
}

/**
 * Fetches all reviews for a specific book, including user details.
 */
export async function getBookReviews(bookId: string) {
  try {
    const bookReviews = await db
      .select({
        ...getTableColumns(reviews),
        user: {
          fullname: users.fullname,
          // Add other user fields if needed, e.g., avatar
        },
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.bookId, bookId))
      .orderBy(desc(reviews.createdAt));

    return {
      success: true,
      data: JSON.parse(JSON.stringify(bookReviews)),
    };
  } catch (error) {
    console.error("Error fetching book reviews:", error);
    return {
      success: false,
      error: "Failed to fetch reviews for this book.",
    };
  }
}
