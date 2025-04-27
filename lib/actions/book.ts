"use server";

import dayjs from "dayjs";
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  or,
} from "drizzle-orm";

import { db } from "@/database/drizzle";
import { books, borrowRecords, users } from "@/database/schema";
import { workflowClient, sendEmail } from "../workflow";
import config from "../config";

const ITEMS_PER_PAGE = 20;

// Generate an HTML receipt for email - simplified version to avoid rendering issues
async function generateReceiptHtml(
  bookId: string,
  userId: string,
  borrowDate: string,
  dueDate: string
) {
  try {
    // Get book and user details
    const [bookDetails, userDetails] = await Promise.all([
      db.select().from(books).where(eq(books.id, bookId)).limit(1),
      db.select().from(users).where(eq(users.id, userId)).limit(1),
    ]);

    if (!bookDetails.length || !userDetails.length) {
      throw new Error("Book or user not found");
    }

    const book = bookDetails[0];
    const user = userDetails[0];

    const { title, author, genre, id } = book;
    const { fullname } = user;

    const formattedDueDate = new Date(dueDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const formattedBorrowDate = new Date(borrowDate).toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    const totalDays = dayjs(dueDate).diff(dayjs(borrowDate), "day");

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ccc; border-radius: 5px; overflow: hidden;">
        <div style="background-color: #1c1f40; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">Brac University Library</h2>
          <p style="margin: 5px 0 0;">Book Borrow Receipt</p>
        </div>
        
        <div style="padding: 20px;">
          <p style="color: #666;">Receipt ID: <strong>#${id}</strong></p>
          <p style="color: #666;">Date Issued: <strong>${formattedBorrowDate}</strong></p>
          <p style="color: #666;">Borrower: <strong>${fullname}</strong></p>
          
          <div style="margin: 20px 0; border-top: 1px dashed #ccc; border-bottom: 1px dashed #ccc; padding: 20px 0;">
            <h3 style="margin-top: 0;">Book Details</h3>
            <p><strong>Title:</strong> ${title}</p>
            <p><strong>Author:</strong> ${author}</p>
            <p><strong>Category:</strong> ${genre}</p>
            <p><strong>Borrowed on:</strong> ${formattedBorrowDate}</p>
            <p><strong>Due Date:</strong> ${formattedDueDate}</p>
            <p><strong>Duration:</strong> ${totalDays} days</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3>Terms & Conditions</h3>
            <ul style="color: #666; padding-left: 20px;">
              <li>Please return the book by the due date.</li>
              <li>Lost or damaged books may incur replacement costs.</li>
              <li>Late returns will be charged at a rate of 20 BDT per day.</li>
            </ul>
          </div>
          
          <p style="text-align: center; font-size: 14px; color: #666; margin-top: 30px;">
            Thank you for using Brac University Library. For any questions or concerns, 
            please contact us at <a href="mailto:library@bracu.ac.bd">library@bracu.ac.bd</a>
          </p>
        </div>
        
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>&copy; ${new Date().getFullYear()} Brac University Library. All rights reserved.</p>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error generating receipt HTML:", error);
    return `
      <div>
        <p>There was an error generating your detailed receipt.</p>
        <p>Your book has been borrowed successfully, but we could not generate the receipt at this time.</p>
        <p>Please contact the library if you need a copy of your receipt.</p>
      </div>
    `;
  }
}

export async function borrowBook(params: BorrowBookParams) {
  const { userId, bookId } = params;

  try {
    // Check if user has already borrowed this book and it's not returned yet
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
        error: "You have already borrowed this book",
        alreadyBorrowed: true,
      };
    }

    const book = await db
      .select({
        availableCopies: books.availableCopies,
      })
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);

    if (!book.length || book[0].availableCopies <= 0) {
      return {
        success: false,
        error: "Book is not available",
      };
    }

    const dueDate = dayjs().add(7, "day").toDate().toDateString();
    const borrowDate = dayjs().toDate().toDateString();

    const record = await db.insert(borrowRecords).values({
      userId,
      bookId,
      dueDate,
      status: "BORROWED",
    });

    await db
      .update(books)
      .set({
        availableCopies: book[0].availableCopies - 1,
      })
      .where(eq(books.id, bookId));

    // Get user email for sending receipt directly
    const userDetails = await db
      .select({
        email: users.email,
        fullname: users.fullname,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const userEmail = userDetails[0]?.email;

    // CRITICAL: Send receipt email directly here regardless of workflow status
    if (userEmail) {
      try {
        console.log("Sending direct receipt email to:", userEmail);

        // Generate the receipt HTML
        const receiptHtml = await generateReceiptHtml(
          bookId,
          userId,
          borrowDate,
          dueDate
        );

        // Send the receipt email directly
        await sendEmail({
          email: userEmail,
          subject: `Your Library Book Receipt - Direct`,
          message: receiptHtml,
          plainText: false,
        });

        console.log("Direct receipt email sent successfully");

        // Also send a confirmation email
        const bookDetails = await db
          .select({
            title: books.title,
            author: books.author,
          })
          .from(books)
          .where(eq(books.id, bookId))
          .limit(1);

        if (bookDetails.length > 0) {
          const formattedDueDate = new Date(dueDate).toLocaleDateString(
            "en-US",
            {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }
          );

          const confirmationMessage = `
            <div>
              <p>Hi ${userDetails[0].fullname},</p>
              <p>You've successfully borrowed the book <strong>"${bookDetails[0].title}"</strong> by ${bookDetails[0].author}.</p>
              <p>Enjoy your reading! Please remember to return the book by <strong>${formattedDueDate}</strong>.</p>
              <p>We've sent your borrow receipt in a separate email for your records.</p>
            </div>
          `;

          await sendEmail({
            email: userEmail,
            subject: `You borrowed "${bookDetails[0].title}"!`,
            message: confirmationMessage,
            plainText: false,
          });
        }
      } catch (emailError) {
        console.error("Error sending direct receipt email:", emailError);
        // Continue with success even if email sending fails
      }
    }

    // Also try to trigger the workflow as a backup but don't let it fail the borrowing process
    try {
      await workflowClient.trigger({
        url: `${config.env.prodApiEndpoint}/api/workflow/borrow-book`,
        body: {
          userId,
          bookId,
          borrowDate,
          dueDate,
        },
      });
      console.log("Workflow triggered successfully");
    } catch (workflowError) {
      console.error("Workflow trigger error (non-critical):", workflowError);
      // Continue with success even if workflow fails
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(record)),
    };
  } catch (error) {
    console.error("Error borrowing book:", error);
    return {
      success: false,
      error: "Error borrowing book",
    };
  }
}

export async function getBorrowedBooks(userId: string) {
  try {
    // Import the function to update overdue books
    const { updateOverdueBooks } = await import("@/lib/admin/actions/book");

    // Update overdue books status before fetching
    await updateOverdueBooks();

    const borrowedBooks = await db
      .select({
        ...getTableColumns(books),
        borrow: {
          ...getTableColumns(borrowRecords),
        },
      })
      .from(borrowRecords)
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .innerJoin(users, eq(borrowRecords.userId, users.id))
      .where(eq(borrowRecords.userId, userId))
      .orderBy(desc(borrowRecords.borrowDate));

    return {
      success: true,
      data: JSON.parse(JSON.stringify(borrowedBooks)),
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      error: "Error getting borrowed books",
    };
  }
}

export async function searchBooks({
  query,
  sort = "available",
  page = 1,
}: {
  query?: string;
  sort?: string;
  page?: number;
}) {
  try {
    const searchConditions = query
      ? or(
          ilike(books.title, `%${query}%`),
          ilike(books.genre, `%${query}%`),
          ilike(books.author, `%${query}%`)
        )
      : undefined;

    const sortOptions: { [key: string]: any } = {
      newest: desc(books.createdAt),
      oldest: asc(books.createdAt),
      highestRated: desc(books.rating),
      available: desc(books.totalCopies),
    };

    const sortingCondition = sortOptions[sort] || desc(books.totalCopies);

    const allBooks = await db
      .select()
      .from(books)
      .where(searchConditions)
      .orderBy(sortingCondition)
      .limit(ITEMS_PER_PAGE)
      .offset((page - 1) * ITEMS_PER_PAGE);

    const totalBooks = await db
      .select({
        count: count(),
      })
      .from(books)
      .where(searchConditions);

    const totalPage = Math.ceil(totalBooks[0].count / ITEMS_PER_PAGE);
    const hasNextPage = page < totalPage;

    return {
      success: true,
      data: JSON.parse(JSON.stringify(allBooks)),
      metadata: {
        totalPage,
        hasNextPage,
      },
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      error: "Error searching books",
    };
  }
}

export async function isBookBorrowedByUser(userId: string, bookId: string) {
  try {
    const borrowedRecord = await db
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

    return {
      success: true,
      isAlreadyBorrowed: borrowedRecord.length > 0,
      borrowedRecord: borrowedRecord[0] || null,
    };
  } catch (error) {
    console.log("Error checking if book is borrowed:", error);
    return {
      success: false,
      isAlreadyBorrowed: false,
      error: "Error checking book status",
    };
  }
}
