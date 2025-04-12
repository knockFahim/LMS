import Image from "next/image";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";

import Avatar from "@/components/Avatar";
import BookList from "@/components/BookList";
import NotFound from "@/components/NotFound";
import { Button } from "@/components/ui/button";
import BookRequestsList from "@/components/BookRequestsList";
import ExtensionRequestForm from "@/components/ExtensionRequestForm";
import ExtensionRequestsHistory from "@/components/ExtensionRequestsHistory";

import { db } from "@/database/drizzle";
import { users } from "@/database/schema";

import config from "@/lib/config";
import { getBorrowedBooks } from "@/lib/actions/book";
import { getUserBookRequests } from "@/lib/actions/bookRequest";

interface BorrowedBookProps {
  data: BorrowedBook[];
  success: boolean;
}

interface BookRequestsProps {
  data: BookRequest[];
  success: boolean;
}

const Page = async () => {
  const session = await auth();
  if (!session?.user?.id) return;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session?.user?.id))
    .limit(1);

  if (!user) redirect("/404");

  const [
    { data: borrowedBooks, success },
    { data: bookRequests, success: requestsSuccess },
  ] = await Promise.all([
    getBorrowedBooks(session?.user?.id) as Promise<BorrowedBookProps>,
    getUserBookRequests(session?.user?.id) as Promise<BookRequestsProps>,
  ]);

  return (
    <>
      <section className="profile">
        <div className="id-card">
          <div className="inner">
            <div className="badge">
              <div className="badge-inner" />
            </div>

            <div>
              <Image
                src="/icons/verified.svg"
                alt="verified"
                width={50}
                height={50}
                className="absolute right-5 top-5"
              />
            </div>

            <div className="mt-20 flex flex-row items-center gap-3">
              <Avatar name={user.fullname} size="lg" />

              <div>
                <p className="text-2xl font-semibold text-white">
                  {user.fullname}
                </p>
                <p className="text-base text-light-100">{user.email}</p>
              </div>
            </div>

            <div className="mt-10">
              <p className="text-lg text-light-100">University</p>
              <p className="text-2xl font-semibold text-white">
                Brac University
              </p>
            </div>

            <div className="mt-10">
              <p className="text-lg text-light-100">Student ID</p>
              <p className="text-2xl font-semibold text-white">
                {user.universityId}
              </p>
            </div>

            <div className="relative mt-10 h-72 w-full">
              <Image
                src={`${config.env.imagekit.urlEndpoint}${user.universityCard}`}
                alt="university-card"
                fill
                className="size-full rounded-xl"
              />
            </div>

            <div className="validity">
              <p>
                Valid for {new Date().getFullYear()}-
                {new Date().getFullYear() + 1} Academic Year
              </p>
            </div>
          </div>

          <form
            action={async () => {
              "use server";
              await signOut();
              redirect("/sign-in");
            }}
          >
            <Button type="submit" variant="destructive" className="logout">
              Logout
            </Button>
          </form>
        </div>

        <div className="flex-1 space-y-16">
          {success && (
            <div>
              {borrowedBooks.length > 0 ? (
                <>
                  <BookList
                    title="Borrowed Books"
                    books={borrowedBooks}
                    isBorrowed={true}
                  />
                  {/* Add ExtensionRequestForm with the userId */}
                  <div className="mt-6">
                    <ExtensionRequestForm
                      userId={session.user.id}
                      borrowedBooks={borrowedBooks}
                    />
                  </div>
                  {/* Show extension request history */}
                  <ExtensionRequestsHistory userId={session.user.id} />
                </>
              ) : (
                <NotFound
                  title="No Borrowed Books"
                  description="You haven't borrowed any books yet. Go to the library to borrow books."
                />
              )}
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bebas-neue text-4xl text-light-100">
                Book Requests
              </h2>
              <Button asChild className="book-overview_btn">
                <Link href="/book-request">+ Request New Book</Link>
              </Button>
            </div>

            {requestsSuccess && (
              <div className="bg-dark-300 rounded-xl p-4">
                <BookRequestsList requests={bookRequests || []} />
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default Page;
