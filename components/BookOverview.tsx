import Image from "next/image";
import { eq, and } from "drizzle-orm";

import BookCover from "./BookCover";
import BorrowBook from "./BorrowBook";
import PlaceHold from "./PlaceHold";
import { Button } from "./ui/button";

import { db } from "@/database/drizzle";
import { users, borrowRecords, fines } from "@/database/schema";
import { checkUserBorrowingEligibility } from "@/lib/actions/fines";

interface Props extends Book {
  userId: string;
}

const BookOverview = async ({
  id,
  title,
  author,
  genre,
  rating,
  totalCopies,
  availableCopies,
  description,
  coverColor,
  coverUrl,
  userId,
}: Props) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return null;

  // Check if the user is already borrowing this book
  const userBorrowingRecord = await db
    .select()
    .from(borrowRecords)
    .where(
      and(
        eq(borrowRecords.userId, userId),
        eq(borrowRecords.bookId, id),
        eq(borrowRecords.status, "BORROWED")
      )
    )
    .limit(1);

  const isAlreadyBorrowing = userBorrowingRecord.length > 0;

  // Check if user has any overdue books or unpaid fines
  const eligibilityResult = await checkUserBorrowingEligibility(userId);

  // Correctly determine the borrowing eligibility message
  let eligibilityMessage;
  if (availableCopies <= 0) {
    eligibilityMessage = "Book is not available";
  } else if (user.status !== "APPROVED") {
    eligibilityMessage =
      "You are not allowed to borrow this book until your account is approved";
  } else if (!eligibilityResult.isEligible) {
    eligibilityMessage = eligibilityResult.message;
  } else {
    eligibilityMessage = "You can borrow this book";
  }

  const borrowingEligibility = {
    isEligible:
      // Base conditions
      availableCopies > 0 &&
      user.status === "APPROVED" &&
      // New condition: no overdue books or unpaid fines
      eligibilityResult.isEligible,
    message: eligibilityMessage,
  };

  return (
    <section className="book-overview">
      <div className="flex flex-1 flex-col gap-5">
        <h1>{title}</h1>

        <div className="book-info">
          <p>
            By <span className="font-semibold text-light-200">{author}</span>
          </p>

          <p>
            Category: <span className="ml-2 text-primary">{genre}</span>
          </p>

          <div className="flex flex-row gap-1">
            <Image src="/icons/star.svg" alt="star" width={22} height={22} />
            <p>{rating}</p>
          </div>
        </div>

        <div className="book-copies">
          <p>
            Total Books: <span>{totalCopies}</span>
          </p>

          <p>
            Available Books: <span>{availableCopies}</span>
          </p>
        </div>

        <p className="book-description">{description}</p>

        {isAlreadyBorrowing ? (
          <div className="mt-4">
            <Button className="book-overview_btn" disabled={true}>
              <Image src="/icons/book.svg" alt="book" width={20} height={20} />
              <p className="font-bebas-neue text-xl text-dark-100">
                Already Borrowed
              </p>
            </Button>
          </div>
        ) : availableCopies > 0 ? (
          <BorrowBook
            bookId={id}
            userId={userId}
            borrowingEligibility={borrowingEligibility}
          />
        ) : user.status === "APPROVED" ? (
          <PlaceHold
            bookId={id}
            userId={userId}
            bookTitle={title}
            borrowingEligibility={borrowingEligibility}
          />
        ) : (
          <p className="mt-4 font-medium text-red-500">
            Your account must be approved to place holds on books
          </p>
        )}

        {!eligibilityResult.isEligible && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
            <p className="font-medium">Borrowing Restricted</p>
            <p className="text-sm">{eligibilityResult.message}</p>
            {eligibilityResult.overdueCount > 0 && (
              <p className="mt-1 text-sm">
                Overdue books: {eligibilityResult.overdueCount}
              </p>
            )}
            {eligibilityResult.fineCount > 0 && (
              <p className="mt-1 text-sm">
                Unpaid fines: {eligibilityResult.totalFines} BDT
              </p>
            )}
          </div>
        )}
      </div>

      <div className="relative flex flex-1 justify-center">
        <div className="relative">
          <BookCover
            variant="wide"
            className="z-10"
            coverColor={coverColor}
            coverUrl={coverUrl}
          />

          <div className="absolute left-16 top-10 rotate-12 opacity-40 max-sm:hidden">
            <BookCover
              variant="wide"
              coverColor={coverColor}
              coverUrl={coverUrl}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default BookOverview;
