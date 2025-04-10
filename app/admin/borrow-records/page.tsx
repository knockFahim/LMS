"use client";

import dayjs from "dayjs";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Avatar from "@/components/Avatar";
import BookCover from "@/components/BookCover";
import Pagination from "@/components/Pagination";
import BookReceipt from "@/components/BookReceipt";

import Menu from "@/components/admin/Menu";
import { borrowStatuses } from "@/constants";
import { getBorrowRecords, updateBorrowStatus } from "@/lib/admin/actions/book";

// Component to handle server data fetching
const BorrowRecordsTable = ({
  records,
  handleStatusChange,
}: {
  records: any[];
  handleStatusChange: (status: string, borrowId: string) => Promise<void>;
}) => {
  return (
    <Table className="overflow-hidden">
      <TableHeader>
        <TableRow className="h-14 border-none bg-light-300">
          <TableHead className="w-72">Book Title</TableHead>
          <TableHead>User Requested</TableHead>
          <TableHead>Borrowed Date</TableHead>
          <TableHead>Return Date</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Receipt</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {records?.length > 0 ? (
          records.map((record) => (
            <TableRow key={record.borrow.id} className="border-b-dark-100/5">
              <TableCell className="py-5 font-medium">
                <div className="flex w-72 flex-row items-center gap-2 text-sm font-semibold text-dark-400">
                  <BookCover
                    variant="extraSmall"
                    coverUrl={record.coverUrl}
                    coverColor={record.coverColor}
                  />
                  <p className="flex-1">{record.title}</p>
                </div>
              </TableCell>

              <TableCell className="text-sm">
                <div className="flex flex-row items-center gap-2">
                  <Avatar name={record.user.fullname} size="md" />
                  <div>
                    <p className="font-semibold text-dark-400">
                      {record.user.fullname}
                    </p>
                    <p className="text-dark-100">{record.user.email}</p>
                  </div>
                </div>
              </TableCell>

              <TableCell className="text-sm font-medium text-dark-200">
                {dayjs(record.borrow.borrowDate).format("MMM DD, YYYY")}
              </TableCell>
              <TableCell className="text-sm font-medium text-dark-200">
                {record.borrow.returnDate
                  ? dayjs(record.borrow.returnDate).format("MMM DD, YYYY")
                  : "---"}
              </TableCell>
              <TableCell className="text-sm font-medium text-dark-200">
                {dayjs(record.borrow.dueDate).format("MMM DD, YYYY")}
              </TableCell>
              <TableCell>
                <Menu
                  label="Change Status"
                  initialValue={record.borrow.status!.toLowerCase()}
                  items={borrowStatuses}
                  borrowId={record.borrow.id}
                  onStatusChange={handleStatusChange}
                />
              </TableCell>
              <TableCell>
                <BookReceipt btnVariant="admin" {...(record as BorrowedBook)} />
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={7} className="pt-10 text-center">
              No records found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

// Main page component
const Page = () => {
  const searchParams = useSearchParams();
  const query = searchParams.get("query") || undefined;
  const sort = searchParams.get("sort") || undefined;
  const page = Number(searchParams.get("page") || "1");

  const [records, setRecords] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch records when the component mounts or search params change
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true);
        const result = await getBorrowRecords({ query, sort, page });
        if (result.success) {
          setRecords(result.data);
          setMetadata(result.metadata);
        }
      } catch (error) {
        console.error("Error fetching records:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [query, sort, page]); // Re-fetch when these dependencies change

  // Handle status change
  const handleStatusChange = async (status: string, borrowId: string) => {
    const result = await updateBorrowStatus({ borrowId, status });

    if (result.success) {
      // Update the local state to reflect the change
      setRecords((prevRecords) =>
        prevRecords.map((record) => {
          if (record.borrow.id === borrowId) {
            return {
              ...record,
              borrow: {
                ...record.borrow,
                status: status.toUpperCase(),
                // If status is RETURNED, set return date to today
                returnDate:
                  status.toUpperCase() === "RETURNED"
                    ? new Date().toISOString()
                    : record.borrow.returnDate,
              },
            };
          }
          return record;
        })
      );
    } else {
      throw new Error(result.error || "Failed to update status");
    }
  };

  return (
    <section className="w-full rounded-2xl bg-white p-7">
      <h2 className="text-xl font-semibold">Borrow Book Requests</h2>

      <div className="mt-7 w-full overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10">
            <p>Loading records...</p>
          </div>
        ) : (
          <BorrowRecordsTable
            records={records}
            handleStatusChange={handleStatusChange}
          />
        )}
      </div>

      <div className="mt-8">
        <Pagination variant="light" hasNextPage={metadata?.hasNextPage} />
      </div>
    </section>
  );
};

export default Page;
