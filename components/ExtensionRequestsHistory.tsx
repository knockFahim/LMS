"use client";

import dayjs from "dayjs";
import { useState, useEffect } from "react";

import { getUserExtensionRequests } from "@/lib/actions/extensionRequest";
import { Badge } from "./ui/badge";

const statusStyles = {
  PENDING: {
    bgColor: "bg-[#FFF8E5]",
    textColor: "text-[#B93815]",
  },
  APPROVED: {
    bgColor: "bg-[#ECFDF3]",
    textColor: "text-[#027A48]",
  },
  REJECTED: {
    bgColor: "bg-[#FFF1F3]",
    textColor: "text-[#C01048]",
  },
};

const StatusBadge = ({
  status,
}: {
  status: "PENDING" | "APPROVED" | "REJECTED";
}) => {
  // Fix: Add null check for status
  if (!status)
    return <Badge className="bg-gray-200 text-gray-600">Unknown</Badge>;

  const style = statusStyles[status] || statusStyles.PENDING;

  return (
    <Badge className={`${style.bgColor} ${style.textColor} font-medium`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
};

const ExtensionRequestsHistory = ({ userId }: { userId: string }) => {
  const [requests, setRequests] = useState<ExtensionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const result = await getUserExtensionRequests(userId);
        if (result.success && result.data) {
          // Fix: Map the data to ensure it has the correct structure
          const formattedRequests = result.data.map((req) => ({
            id: req.extension?.id || `req-${Math.random()}`,
            book: req.book || { title: "Unknown Book" },
            requestDate: req.extension?.createdAt,
            newDueDate: req.extension?.requestedDueDate,
            reason: req.extension?.reason,
            status: req.extension?.status,
          }));

          setRequests(formattedRequests);
        }
      } catch (error) {
        console.error("Error fetching extension requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [userId]);

  if (loading) {
    return (
      <div className="mt-5 text-center text-sm">
        Loading extension requests...
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="mt-5 text-center text-sm text-gray-400">
        No extension requests found
      </div>
    );
  }

  return (
    <div className="mt-5">
      <h3 className="mb-3 text-lg font-semibold text-white">
        Extension Requests
      </h3>
      <div className="space-y-3">
        {requests.map((request) => (
          <div
            key={request.id || `req-${Math.random()}`}
            className="rounded-lg bg-dark-400 p-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">
                  {request.book?.title || "Unknown Book"}
                </p>
                <p className="text-sm text-light-100">
                  Requested:{" "}
                  {request.requestDate
                    ? dayjs(request.requestDate).format("MMM DD, YYYY")
                    : "Unknown date"}
                </p>
                <p className="text-sm text-light-100">
                  New due date:{" "}
                  {request.newDueDate
                    ? dayjs(request.newDueDate).format("MMM DD, YYYY")
                    : "Unknown date"}
                </p>
                {request.reason && (
                  <p className="mt-2 text-sm text-light-100">
                    <span className="font-medium">Reason:</span>{" "}
                    {request.reason}
                  </p>
                )}
              </div>
              <StatusBadge status={request.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExtensionRequestsHistory;
