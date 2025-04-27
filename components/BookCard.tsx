import dayjs from "dayjs";
import Link from "next/link";
import Image from "next/image";

import BookCover from "./BookCover";
import BookReceipt from "./BookReceipt";

export const NormalBook = ({
  id,
  title,
  genre,
  coverColor,
  coverUrl,
}: Book) => {
  return (
    <li className="w-full xs:w-52">
      <Link href={`/books/${id}`} className="flex w-full flex-col items-center">
        <BookCover coverColor={coverColor} coverUrl={coverUrl} />

        <div className="mt-4 w-full xs:w-44">
          <p className="book-title">{title}</p>
          <p className="book-genre">{genre}</p>
        </div>
      </Link>
    </li>
  );
};

export const BorrowedBook = (props: BorrowedBook) => {
  const { id, title, genre, coverColor, coverUrl, borrow } = props;
  const { borrowDate, dueDate, returnDate, status } = borrow;

  const daysLeft = dayjs(dueDate).diff(dayjs(), "day");

  const isReturned = status === "RETURNED";
  const isOverDue =
    (daysLeft < 0 && status === "BORROWED") || status === "OVERDUE";

  return (
    <li className="borrowed-book">
      {isOverDue && (
        <Image
          src="/icons/warning.svg"
          alt="warning"
          width={30}
          height={30}
          className="absolute -top-3 left-0 object-contain"
        />
      )}

      <Link href={`/books/${id}`} className="flex w-full flex-col items-center">
        <div
          className="borrowed-book_cover"
          style={{
            background: `${coverColor}4d`,
          }}
        >
          <BookCover
            coverColor={coverColor}
            coverUrl={coverUrl}
            variant="medium"
          />
        </div>

        <div className="mt-2 w-full">
          <p className="book-title">{title}</p>
          <p className="book-genre">{genre}</p>

          <div className="mt-5 space-y-1.5">
            <div className="flex flex-row items-center gap-1">
              <Image
                src="/icons/book-2.svg"
                alt="calendar"
                width={18}
                height={18}
              />
              <p className="text-light-100">
                Borrowed on {dayjs(borrowDate).format("MMM DD")}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-1 flex-row items-center gap-1">
                <Image
                  src={
                    isReturned
                      ? "/icons/tick.svg"
                      : isOverDue
                        ? "/icons/warning.svg"
                        : "/icons/calendar.svg"
                  }
                  alt="calendar"
                  width={18}
                  height={18}
                />
                <p className="text-light-100">
                  {isReturned
                    ? "Returned on " + dayjs(returnDate).format("MMM DD")
                    : isOverDue
                      ? "Overdue by " +
                        Math.abs(daysLeft) +
                        " " +
                        (Math.abs(daysLeft) === 1 ? "day" : "days")
                      : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left to due`}
                </p>
              </div>

              <BookReceipt {...props} />
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
};
