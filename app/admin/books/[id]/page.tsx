import dayjs from "dayjs";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import BookCover from "@/components/BookCover";
import BookVideo from "@/components/BookVideo";
import BookReviews from "@/components/BookReviews";
import { Button } from "@/components/ui/button";
import { getBook } from "@/lib/admin/actions/book";

const Page = async ({ params }: PageProps) => {
  const { id } = await params;
  const { success, data: book } = (await getBook({ id })) as {
    success: boolean;
    data: Book;
  };

  if (!success) redirect("/404");

  return (
    <>
      <Button asChild className="back-btn">
        <Link href="/admin/books">Go Back</Link>
      </Button>

      <div className="w-full">
        <section className="flex flex-col gap-12 lg:flex-row">
          <div
            className="flex w-full items-center justify-center rounded-md px-20 py-10 lg:w-fit"
            style={{
              background: `${book.coverColor}4d`,
            }}
          >
            <BookCover
              variant="regular"
              coverUrl={book.coverUrl}
              coverColor={book.coverColor}
            />
          </div>

          <div className="flex flex-1 flex-col">
            <div className="flex flex-row items-center gap-2">
              <p className="text-lg text-light-500">Created At:</p>
              <Image
                src="/icons/admin/calendar.svg"
                width={20}
                height={20}
                alt="calendar"
              />
              <p className="text-base text-dark-200">
                {dayjs(book.createdAt).format("DD/MM/YYYY")}
              </p>
            </div>

            <h2 className="mt-5 text-2xl font-semibold text-dark-400">
              {book.title}
            </h2>
            <p className="mt-2.5 text-lg font-semibold text-dark-200">
              By {book.author}
            </p>
            <p className="mt-2 text-base text-light-500">{book.genre}</p>

            <p className="mt-5 text-base text-dark-700">{book.description}</p>

            <Button
              className="mt-5 min-h-12 bg-primary-admin text-sm font-bold hover:bg-primary-admin/70"
              asChild
            >
              <Link href={`/admin/books/${id}/edit`}>
                <Image
                  src="/icons/admin/edit.svg"
                  width={20}
                  height={20}
                  alt="edit"
                  className="brightness-0 invert"
                />
                Edit Book
              </Link>
            </Button>
          </div>
        </section>

        <div className="mt-10 flex flex-col gap-12 lg:flex-row">
          <section className="flex-1">
            <h3 className="text-xl font-semibold text-dark-400">Summary</h3>
            <div className="mt-5 space-y-5 text-slate-500">
              {book.summary
                ?.split("\n")
                .map((line, index) => <p key={index}>{line}</p>)}
            </div>
          </section>

          <section className="flex-1">
            <h3 className="mb-5 text-xl font-semibold text-dark-400">Video</h3>
            <BookVideo videoUrl={book.videoUrl} />
          </section>
        </div>

        {/* Reviews Section */}
        <section className="mt-10">
          <h3 className="mb-5 text-xl font-semibold text-dark-400">
            User Reviews
          </h3>
          <BookReviews bookId={id} />
        </section>
      </div>
    </>
  );
};

export default Page;
