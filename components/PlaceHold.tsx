"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "./ui/button";
import { toast } from "@/hooks/use-toast";
import { placeHold, getBookHolds } from "@/lib/actions/holds";

interface Props {
  userId: string;
  bookId: string;
  bookTitle: string;
}

const PlaceHold = ({ userId, bookId, bookTitle }: Props) => {
  const router = useRouter();
  const [isPlacingHold, setIsPlacingHold] = useState(false);
  const [holdCount, setHoldCount] = useState(0);
  const [hasActiveHold, setHasActiveHold] = useState(false);

  useEffect(() => {
    const checkExistingHolds = async () => {
      try {
        // Get holds for this book
        const result = await getBookHolds(bookId);
        if (result.success) {
          // Set the total count of holds
          setHoldCount(result.data.length);

          // Check if user already has a hold on this book
          const userHold = result.data.find(
            (hold) =>
              hold.userId === userId &&
              ["WAITING", "READY"].includes(hold.status)
          );
          setHasActiveHold(!!userHold);
        }
      } catch (error) {
        console.error("Error checking holds:", error);
      }
    };

    checkExistingHolds();
  }, [bookId, userId]);

  const handlePlaceHold = async () => {
    setIsPlacingHold(true);

    try {
      const result = await placeHold({
        userId,
        bookId,
      });

      if (result.success) {
        toast({
          title: "Hold Placed Successfully",
          description: `You've been added to the waiting list for "${bookTitle}"`,
        });

        // Update UI to show user has a hold
        setHasActiveHold(true);
        setHoldCount((prevCount) => prevCount + 1);

        // Refresh the page to update the UI
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to place hold",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error placing hold:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsPlacingHold(false);
    }
  };

  return (
    <div className="mt-4">
      <Button
        className="book-overview_btn"
        onClick={handlePlaceHold}
        disabled={isPlacingHold || hasActiveHold}
      >
        <Image src="/icons/bookmark.svg" alt="hold" width={20} height={20} />

        <p className="font-bebas-neue text-xl text-dark-100">
          {isPlacingHold
            ? "Placing Hold..."
            : hasActiveHold
              ? "On Hold List"
              : "Place Hold"}
        </p>
      </Button>

      {holdCount > 0 && (
        <p className="mt-2 text-sm text-dark-400">
          {hasActiveHold
            ? "You are on the waiting list for this book."
            : `${holdCount} ${holdCount === 1 ? "person is" : "people are"} waiting for this book.`}
        </p>
      )}
    </div>
  );
};

export default PlaceHold;
