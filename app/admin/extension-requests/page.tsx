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
import { Badge } from "@/components/ui/badge";
import Avatar from "@/components/Avatar";
import Pagination from "@/components/Pagination";
import { Button } from "@/components/ui/button";

import {
  getAllExtensionRequests,
  updateExtensionRequestStatus,
} from "@/lib/actions/extensionRequest";

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  let bgColor = "bg-[#FFF8E5]";
  let textColor = "text-[#B93815]";

  if (status === "APPROVED") {
    bgColor = "bg-[#ECFDF3]";
    textColor = "text-[#027A48]";
  } else if (status === "REJECTED") {
    bgColor = "bg-[#FFF1F3]";
    textColor = "text-[#C01048]";
  }

  return (
    <Badge className={`${bgColor} ${textColor} font-medium`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
};

const Page = () => {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") || "1");

  const [requests, setRequests] = useState<ExtensionRequest[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch extension requests
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const result = await getAllExtensionRequests({ page });
        if (result.success) {
          setRequests(result.data || []);
          setMetadata(result.metadata);
        }
      } catch (error) {
        console.error("Error fetching extension requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [page]);

  // Handle approve/reject actions
  const handleStatusUpdate = async (
    requestId: string,
    status: "APPROVED" | "REJECTED"
  ) => {
    try {
      setProcessingId(requestId);
      const result = await updateExtensionRequestStatus(requestId, status);

      if (result.success) {
        // Update local state to reflect the change
        setRequests((prevRequests) =>
          prevRequests.map((request) =>
            request.id === requestId ? { ...request, status } : request
          )
        );
      }
    } catch (error) {
      console.error("Error updating extension request status:", error);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <section className="w-full rounded-2xl bg-white p-7">
      <h2 className="text-xl font-semibold">Extension Requests</h2>

      <div className="mt-7 w-full overflow-hidden">
        <Table className="overflow-hidden">
          <TableHeader>
            <TableRow className="h-14 border-none bg-light-300">
              <TableHead className="w-56">User</TableHead>
              <TableHead>Book</TableHead>
              <TableHead>Current Due Date</TableHead>
              <TableHead>Requested Date</TableHead>
              <TableHead>New Due Date</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  Loading extension requests...
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  No extension requests found
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.id} className="border-b-dark-100/5">
                  <TableCell>
                    <div className="flex flex-row items-center gap-2">
                      <Avatar name={request.user.fullname} size="sm" />
                      <div>
                        <p className="font-medium text-dark-400">
                          {request.user.fullname}
                        </p>
                        <p className="text-sm text-dark-100">
                          {request.user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="font-medium text-dark-400">
                    {request.book.title}
                  </TableCell>

                  <TableCell className="text-dark-200">
                    {dayjs(request.currentDueDate).format("MMM DD, YYYY")}
                  </TableCell>

                  <TableCell className="text-dark-200">
                    {dayjs(request.requestDate).format("MMM DD, YYYY")}
                  </TableCell>

                  <TableCell className="text-dark-200">
                    {dayjs(request.newDueDate).format("MMM DD, YYYY")}
                  </TableCell>

                  <TableCell className="max-w-xs truncate text-dark-200">
                    {request.reason || "No reason provided"}
                  </TableCell>

                  <TableCell>
                    <StatusBadge status={request.status} />
                  </TableCell>

                  <TableCell>
                    {request.status === "PENDING" ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-600 text-green-600 hover:bg-green-50"
                          onClick={() =>
                            handleStatusUpdate(request.id, "APPROVED")
                          }
                          disabled={processingId === request.id}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-600 text-red-600 hover:bg-red-50"
                          onClick={() =>
                            handleStatusUpdate(request.id, "REJECTED")
                          }
                          disabled={processingId === request.id}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Processed</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && metadata && (
        <div className="mt-8">
          <Pagination variant="light" hasNextPage={metadata?.hasNextPage} />
        </div>
      )}
    </section>
  );
};

export default Page;
