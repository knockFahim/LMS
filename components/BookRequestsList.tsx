"use client";

import dayjs from "dayjs";
import Image from "next/image";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  requests: BookRequest[];
}

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

const BookRequestsList = ({ requests }: Props) => {
  if (!requests || requests.length === 0) {
    return (
      <div className="p-6 text-center text-light-100">
        <p>You haven't made any book requests yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-lg">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="border-b border-dark-200">
            <TableHead className="text-light-100">Title</TableHead>
            <TableHead className="text-light-100">Author</TableHead>
            <TableHead className="text-light-100">Date Requested</TableHead>
            <TableHead className="text-light-100">Status</TableHead>
            <TableHead className="text-light-100">Admin Note</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {requests.map((request) => (
            <TableRow
              key={request.id}
              className="border-b border-dark-200/30"
            >
              <TableCell className="text-light-200 font-medium">
                {request.title}
              </TableCell>
              <TableCell className="text-light-200">
                {request.author || "—"}
              </TableCell>
              <TableCell className="text-light-200">
                {dayjs(request.createdAt).format("MMM DD, YYYY")}
              </TableCell>
              <TableCell>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(
                    request.status
                  )}`}
                >
                  {request.status.charAt(0) + request.status.slice(1).toLowerCase()}
                </span>
              </TableCell>
              <TableCell className="text-light-200">
                {request.adminNote || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default BookRequestsList;