"use server";

import {
  or,
  desc,
  asc,
  eq,
  count,
  ilike,
  and,
  getTableColumns,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/database/drizzle";
import { books, borrowRecords, users } from "@/database/schema";

const ITEMS_PER_PAGE = 20;

export async function createBook(params: BookParams) {
  try {
    const newBook = await db
      .insert(books)
      .values({
        ...params,
        availableCopies: params.totalCopies,
      })
      .returning();

    return {
      success: true,
      data: JSON.parse(JSON.stringify(newBook[0])),
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      error: "Error creating book",
    };
  }
}

export async function getBooks({
  query,
  sort = "available",
  page = 1,
  limit = ITEMS_PER_PAGE,
}: QueryParams) {
  try {
    console.log("Book search params:", { query, sort, page, limit });

    // If there's a search query, create appropriate search conditions
    let searchConditions;

    if (query && query.trim() !== "") {
      // Create case-insensitive search matching title, genre or author
      searchConditions = or(
        ilike(books.title, `%${query}%`),
        ilike(books.genre, `%${query}%`),
        ilike(books.author, `%${query}%`)
      );
    }

    // Set up sorting options
    const sortOptions: Record<string, any> = {
      newest: desc(books.createdAt),
      oldest: asc(books.createdAt),
      highestRated: desc(books.rating),
      available: desc(books.totalCopies),
    };

    const sortingCondition = sortOptions[sort] || sortOptions.available;

    // Execute the database query with search conditions if present
    const booksData = await db
      .select()
      .from(books)
      .where(searchConditions)
      .orderBy(sortingCondition)
      .limit(limit)
      .offset((page - 1) * limit);

    console.log(`Found ${booksData.length} books for query: "${query}"`);

    // Get total count for pagination
    const totalItems = await db
      .select({
        count: count(books.id),
      })
      .from(books)
      .where(searchConditions);

    const totalPages = Math.ceil(totalItems[0].count / ITEMS_PER_PAGE);
    const hasNextPage = page < totalPages;

    return {
      success: true,
      data: booksData,
      metadata: {
        totalPages,
        hasNextPage,
      },
    };
  } catch (error) {
    console.error("Error fetching books:", error);
    return {
      success: false,
      error: "An error occurred while fetching books",
    };
  }
}

export async function getBorrowRecords({
  query,
  sort = "available",
  page = 1,
  limit = ITEMS_PER_PAGE,
  additionalCondition,
}: QueryParams & { additionalCondition?: any }) {
  try {
    const offset = (page - 1) * limit;

    const searchConditions = query
      ? or(
          ilike(books.title, `%${query}%`),
          ilike(books.genre, `%${query}%`),
          ilike(users.fullname, `%${query}%`)
        )
      : undefined;

    const sortOptions = {
      newest: desc(books.createdAt),
      oldest: asc(books.createdAt),
      highestRated: desc(books.rating),
      available: desc(books.availableCopies),
    };

    const sortingCondition =
      sortOptions[sort as keyof typeof sortOptions] || sortOptions.available;

    // Combine search conditions with additional condition if provided
    const whereCondition = additionalCondition
      ? searchConditions
        ? and(searchConditions, additionalCondition)
        : additionalCondition
      : searchConditions
        ? and(searchConditions)
        : undefined;

    const [borrowRecordsData, totalItems] = await Promise.all([
      db
        .select({
          ...getTableColumns(books),
          borrow: {
            ...getTableColumns(borrowRecords),
          },
          user: {
            ...getTableColumns(users),
          },
        })
        .from(borrowRecords)
        .innerJoin(books, eq(borrowRecords.bookId, books.id))
        .innerJoin(users, eq(borrowRecords.userId, users.id))
        .where(whereCondition)
        .orderBy(sortingCondition)
        .limit(limit)
        .offset(offset),

      db
        .select({ count: count() })
        .from(borrowRecords)
        .innerJoin(books, eq(borrowRecords.bookId, books.id))
        .innerJoin(users, eq(borrowRecords.userId, users.id))
        .where(whereCondition),
    ]);

    const totalCount = Number(totalItems[0]?.count) || 0;
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;

    return {
      success: true,
      data: borrowRecordsData,
      metadata: {
        totalPages,
        hasNextPage,
        totalCount,
        currentPage: page,
      },
    };
  } catch (error) {
    console.error("Error fetching borrow records:", error);
    return {
      success: false,
      error: "Something went wrong while fetching borrow records.",
    };
  }
}

export async function editBook(params: UpdateBookParams) {
  try {
    const existingBook = await db
      .select()
      .from(books)
      .where(eq(books.id, params.bookId))
      .limit(1);

    if (existingBook.length === 0) {
      return {
        success: false,
        error: "Book not found",
      };
    }

    // Calculate how many copies are currently borrowed
    const borrowedCopies =
      existingBook[0].totalCopies - existingBook[0].availableCopies;

    // Calculate new availableCopies based on the new totalCopies and current borrowed copies
    const availableCopies = Math.max(0, params.totalCopies - borrowedCopies);

    const updatedBook = await db
      .update(books)
      .set({
        ...params,
        availableCopies,
      })
      .where(eq(books.id, params.bookId))
      .returning();

    revalidatePath("/admin/books");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(updatedBook[0])),
    };
  } catch (error) {
    console.error("Error editing book:", error);
    return {
      success: false,
      error: "Error editing book",
    };
  }
}

export async function getBook({ id }: { id: string }) {
  try {
    const book = await db.select().from(books).where(eq(books.id, id)).limit(1);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(book[0])),
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      error: "Error getting book",
    };
  }
}

export async function updateBorrowStatus({
  borrowId,
  status,
}: {
  borrowId: string;
  status: string;
}) {
  try {
    // Get the current borrow record
    const currentRecord = await db
      .select()
      .from(borrowRecords)
      .where(eq(borrowRecords.id, borrowId))
      .limit(1);

    if (currentRecord.length === 0) {
      return {
        success: false,
        error: "Borrow record not found",
      };
    }

    // Make sure status is uppercase to match the enum type in the database
    const normalizedStatus = status.toUpperCase();

    // Check if it's a valid status value
    if (!["BORROWED", "RETURNED", "OVERDUE"].includes(normalizedStatus)) {
      return {
        success: false,
        error: "Invalid status value. Must be BORROWED, RETURNED, or OVERDUE",
      };
    }

    // If changing to RETURNED, we need to update the book's available copies
    if (
      normalizedStatus === "RETURNED" &&
      currentRecord[0].status !== "RETURNED"
    ) {
      // Get the associated book
      const book = await db
        .select()
        .from(books)
        .where(eq(books.id, currentRecord[0].bookId))
        .limit(1);

      if (book.length > 0) {
        // Increase available copies
        await db
          .update(books)
          .set({
            availableCopies: book[0].availableCopies + 1,
          })
          .where(eq(books.id, currentRecord[0].bookId));
      }

      // Set the return date if it's being returned
      await db
        .update(borrowRecords)
        .set({
          status: normalizedStatus,
          returnDate: new Date().toISOString().split("T")[0], // Current date in YYYY-MM-DD format
        })
        .where(eq(borrowRecords.id, borrowId));
    } else {
      // Just update the status
      await db
        .update(borrowRecords)
        .set({
          status: normalizedStatus,
        })
        .where(eq(borrowRecords.id, borrowId));
    }

    // Revalidate the admin borrow-records page to see changes immediately
    revalidatePath("/admin/borrow-records");

    return {
      success: true,
      message: `Status updated to ${normalizedStatus}`,
    };
  } catch (error) {
    console.error("Error updating borrow status:", error);
    return {
      success: false,
      error: "Something went wrong while updating the status",
    };
  }
}

// Create a debug endpoint to help troubleshoot search
export async function debugSearch(query: string) {
  console.log("Debug search called with query:", query);

  try {
    // Try both types of search conditions to see what works
    const searchConditions1 = or(
      ilike(books.title, `%${query}%`),
      ilike(books.genre, `%${query}%`),
      ilike(books.author, `%${query}%`)
    );

    const searchConditions2 = or(
      ilike(books.title, `%${query.toLowerCase()}%`),
      ilike(books.genre, `%${query.toLowerCase()}%`),
      ilike(books.author, `%${query.toLowerCase()}%`)
    );

    const [results1, results2] = await Promise.all([
      db.select().from(books).where(searchConditions1).limit(5),
      db.select().from(books).where(searchConditions2).limit(5),
    ]);

    console.log(`Regular search found ${results1.length} results`);
    console.log(`Lowercase search found ${results2.length} results`);

    // Also try a direct simple query
    const directResults = await db
      .select()
      .from(books)
      .where(ilike(books.title, `%${query}%`))
      .limit(5);

    console.log(`Direct title search found ${directResults.length} results`);
    console.log("Sample books in database:", directResults);

    return {
      success: true,
      regularResults: results1.length,
      lowercaseResults: results2.length,
      directResults: directResults.length,
      sampleBooks: directResults.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author,
      })),
    };
  } catch (error) {
    console.error("Error in debug search:", error);
    return {
      success: false,
      error: "Error in debug search",
    };
  }
}
