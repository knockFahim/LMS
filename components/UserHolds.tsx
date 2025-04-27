"use client";

import dayjs from "dayjs";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "./ui/button";
import { toast } from "@/hooks/use-toast";
import BookCover from "./BookCover";
import { cancelHold } from "@/lib/actions/holds";

interface UserHoldsProps {
  holds: any[];
}

const UserHolds = ({ holds }: UserHoldsProps) => {
  const router = useRouter();
  const [processingHoldId, setProcessingHoldId] = useState<string | null>(null);

  if (!holds.length) {
    return (
      <div className="p-8 text-center">
        <p className="text-dark-300">
          You don't have any holds placed currently.
        </p>
      </div>
    );
  }

  const handleCancelHold = async (holdId: string, bookTitle: string) => {
    setProcessingHoldId(holdId);

    try {
      const result = await cancelHold(holdId);

      if (result.success) {
        toast({
          title: "Hold Cancelled",
          description: `You've successfully cancelled your hold for "${bookTitle}"`,
        });

        // Refresh to update the UI
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to cancel hold",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error cancelling hold:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setProcessingHoldId(null);
    }
  };

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
      {holds.map((hold) => (
        <div
          key={hold.id}
          className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white"
        >
          <div className="flex p-4">
            <div className="h-24 w-16 shrink-0">
              <BookCover
                variant="small"
                coverUrl={hold.book.coverUrl}
                coverColor={hold.book.coverColor}
              />
            </div>

            <div className="ml-4 flex-1">
              <Link href={`/books/${hold.book.id}`} className="hover:underline">
                <h3 className="text-lg font-medium text-dark-500">
                  {hold.book.title}
                </h3>
              </Link>
              <p className="text-sm text-dark-300">{hold.book.author}</p>

              <div className="mt-2 flex items-center text-xs text-dark-300">
                <Image
                  src="/icons/calendar.svg"
                  alt="calendar"
                  width={14}
                  height={14}
                />
                <span className="ml-1">
                  Hold placed on {dayjs(hold.requestDate).format("MMM D, YYYY")}
                </span>
              </div>

              <div className="mt-1 flex items-center text-xs">
                <div
                  className={`rounded-full px-2 py-1 ${getStatusStyles(hold.status)}`}
                >
                  {getStatusLabel(hold.status)}
                </div>
              </div>

              {hold.status === "READY" && hold.expiryDate && (
                <div className="mt-2 text-xs text-red-500">
                  Pickup by: {dayjs(hold.expiryDate).format("MMM D, YYYY")}
                </div>
              )}
            </div>
          </div>

          {(hold.status === "WAITING" || hold.status === "READY") && (
            <div className="mt-auto border-t border-gray-200 p-3">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => handleCancelHold(hold.id, hold.book.title)}
                disabled={processingHoldId === hold.id}
              >
                {processingHoldId === hold.id ? "Cancelling..." : "Cancel Hold"}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

function getStatusStyles(status: string) {
  switch (status) {
    case "WAITING":
      return "bg-yellow-50 text-yellow-700";
    case "READY":
      return "bg-green-50 text-green-700";
    case "FULFILLED":
      return "bg-blue-50 text-blue-700";
    case "CANCELLED":
      return "bg-gray-50 text-gray-600";
    case "EXPIRED":
      return "bg-red-50 text-red-700";
    default:
      return "bg-gray-50 text-gray-700";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "WAITING":
      return "Waiting";
    case "READY":
      return "Ready for Pickup";
    case "FULFILLED":
      return "Fulfilled";
    case "CANCELLED":
      return "Cancelled";
    case "EXPIRED":
      return "Expired";
    default:
      return status;
  }
}

export default UserHolds;
