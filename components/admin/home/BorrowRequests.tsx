import Link from "next/link";

import BookStripe from "../BookStripe";
import { Button } from "@/components/ui/button";

import { getBorrowRecords } from "@/lib/admin/actions/book";
import { eq } from "drizzle-orm";
import { borrowRecords as borrowRecordsSchema } from "@/database/schema";

const BorrowRequests = async () => {
  // Get only active borrows with "BORROWED" status
  const { data: activeRecords } = await getBorrowRecords({
    sort: "newest",
    page: 1,
    limit: 5,
    additionalCondition: eq(borrowRecordsSchema.status, "BORROWED"),
  });

  if (!activeRecords) {
    throw new Error("Failed to fetch borrow records");
  }

  return (
    <section className="rounded-xl bg-white p-4">
      <div className="flex justify-between">
        <h3 className="text-xl font-semibold  text-dark-400">Active Borrows</h3>

        <Button asChild className="view-btn">
          <Link href="/admin/borrow-records">View All</Link>
        </Button>
      </div>

      <div className="mt-7 space-y-3">
        {activeRecords?.length! > 0 ? (
          activeRecords?.map((book) => (
            <BookStripe key={book.borrow.id} book={book as BorrowedBook} />
          ))
        ) : (
          <p className="py-3 text-center text-sm text-dark-200">
            No active borrows found
          </p>
        )}
      </div>
    </section>
  );
};

export default BorrowRequests;
