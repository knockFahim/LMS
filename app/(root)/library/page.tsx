import Link from "next/link";
import Search from "@/components/Search";
import BookList from "@/components/BookList";
import Pagination from "@/components/Pagination";
import { Button } from "@/components/ui/button";
import { searchBooks } from "@/lib/actions/book";

const Page = async ({ searchParams }: PageProps) => {
  // Fix: properly extract query parameters
  const query = searchParams.query || "";
  const sort = (searchParams.sort as string) || "available";
  const page = Number(searchParams.page) || 1;

  const { data: allBooks, metadata } = await searchBooks({
    query,
    sort,
    page,
  });

  return (
    <>
      <section className="library">
        <p className="library-subtitle">Discover Your Next Great Read</p>

        <h2 className="library-title">
          Explore and Search for{" "}
          <span className="font-semibold text-primary">Any Book</span> In Our
          Library
        </h2>

        <Search />
      </section>

      {allBooks?.length === 0 && query && (
        <div className="mt-8 flex flex-col items-center justify-center text-center">
          <p className="text-light-200 mb-4">Couldn't find the book you're looking for?</p>
          <Button asChild className="book-overview_btn">
            <Link href="/book-request">Request a Book</Link>
          </Button>
        </div>
      )}

      <BookList
        title="All Library Books"
        books={allBooks}
        containerClassName="mt-16"
        showSorts
        showNoResultBtn
      />

      <div className="mt-12 border-t border-dark-300/50 pt-12">
        <Pagination variant="dark" hasNextPage={metadata?.hasNextPage} />
      </div>
    </>
  );
};

export default Page;
