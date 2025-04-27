import Image from "next/image";
import { eq, and } from "drizzle-orm";

import BookCover from "./BookCover";
import BorrowBook from "./BorrowBook";
import PlaceHold from "./PlaceHold";
import { Button } from "./ui/button";

import { db } from "@/database/drizzle";
import { users, borrowRecords } from "@/database/schema";

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

  const borrowingEligibility = {
    isEligible: availableCopies > 0 && user.status === "APPROVED",
    message:
      availableCopies <= 0
        ? "Book is not available"
        : "You are not allowed to borrow this book until your account is approved",
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
          <PlaceHold bookId={id} userId={userId} bookTitle={title} />
        ) : (
          <p className="mt-4 font-medium text-red-500">
            Your account must be approved to place holds on books
          </p>
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
