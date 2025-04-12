"use client";

import dayjs from "dayjs";
import Image from "next/image";
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
import Pagination from "@/components/Pagination";
import BookRequestDialog from "@/components/admin/dialogs/BookRequestDialog";

import { Button } from "@/components/ui/button";
import { getBookRequests } from "@/lib/actions/bookRequest";

const getStatusBadgeClass = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending":
      return "bg-[#FEF3C7] text-[#B54708]";
    case "approved":
      return "bg-[#D1FAE5] text-[#065F46]";
    case "rejected":
      return "bg-[#FEE2E2] text-[#B91C1C]";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const Page = () => {
  const searchParams = useSearchParams();
  const query = searchParams.get("query") || undefined;
  const page = Number(searchParams.get("page") || "1");

  const [requests, setRequests] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch requests when the component mounts or search params change
  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getBookRequests({
          query,
          page,
        });

        if (result.success) {
          setRequests(result.data);
          setMetadata(result.metadata);
        } else {
          console.error("Failed to fetch book requests:", result.error);
          setError(
            result.error || "An error occurred while fetching book requests."
          );
        }
      } catch (error) {
        console.error("Error fetching book requests:", error);
        setError(
          "An unexpected error occurred. Please try refreshing the page."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [query, page]);

  return (
    <section className="w-full rounded-2xl bg-white p-7">
      <h2 className="text-xl font-semibold">Book Requests</h2>

      <div className="mt-7 w-full overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10">
            <p>Loading requests...</p>
          </div>
        ) : error ? (
          <div className="flex justify-center py-10">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <Table className="overflow-hidden">
            <TableHeader>
              <TableRow className="h-14 border-none bg-light-300">
                <TableHead>Book Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Request Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {requests?.length > 0 ? (
                requests.map((request) => (
                  <TableRow key={request.id} className="border-b-dark-100/5">
                    <TableCell className="py-5 font-medium">
                      <div className="w-64 text-sm font-semibold text-dark-400">
                        {request.title}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-dark-200">
                      {request.author || "Not specified"}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-row items-center gap-2">
                        <Avatar name={request.user.fullname} size="sm" />
                        <div>
                          <p className="font-semibold text-dark-400">
                            {request.user.fullname}
                          </p>
                          <p className="text-dark-100">{request.user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-dark-200">
                      {dayjs(request.createdAt).format("MMM DD, YYYY")}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(
                          request.status
                        )}`}
                      >
                        {request.status.charAt(0) +
                          request.status.slice(1).toLowerCase()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <BookRequestDialog
                        bookRequest={request}
                        trigger={
                          <Button className="view-btn !shadow">Review</Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="pt-10 text-center">
                    No requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="mt-8">
        <Pagination variant="light" hasNextPage={metadata?.hasNextPage} />
      </div>
    </section>
  );
};

export default Page;
