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
          setRequests(result.data);
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
          <div key={request.id} className="rounded-lg bg-dark-400 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">{request.book.title}</p>
                <p className="text-sm text-light-100">
                  Requested: {dayjs(request.requestDate).format("MMM DD, YYYY")}
                </p>
                <p className="text-sm text-light-100">
                  New due date:{" "}
                  {dayjs(request.newDueDate).format("MMM DD, YYYY")}
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
