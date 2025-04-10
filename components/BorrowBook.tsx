"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "./ui/button";
import { toast } from "@/hooks/use-toast";
import { borrowBook, isBookBorrowedByUser } from "@/lib/actions/book";

interface Props {
  userId: string;
  bookId: string;
  borrowingEligibility: {
    isEligible: boolean;
    message: string;
  };
}

const BorrowBook = ({ userId, bookId, borrowingEligibility }: Props) => {
  const router = useRouter();
  const [borrowing, setBorrowing] = useState(false);
  const [isAlreadyBorrowed, setIsAlreadyBorrowed] = useState(false);

  useEffect(() => {
    const checkIfBorrowed = async () => {
      try {
        const result = await isBookBorrowedByUser(userId, bookId);
        if (result.success) {
          setIsAlreadyBorrowed(result.isAlreadyBorrowed);
        }
      } catch (error) {
        console.log("Error checking if book is borrowed:", error);
      }
    };

    checkIfBorrowed();
  }, [userId, bookId]);

  const handleBorrowBook = async () => {
    // Don't allow borrowing if the book is already borrowed
    if (isAlreadyBorrowed) {
      toast({
        title: "Error",
        description: "You have already borrowed this book",
        variant: "destructive",
      });
      return;
    }

    if (!borrowingEligibility.isEligible) {
      toast({
        title: "Error",
        description: borrowingEligibility.message,
        variant: "destructive",
      });
      return;
    }

    setBorrowing(true);
    try {
      const result = await borrowBook({ bookId, userId });
      if (result.success) {
        toast({
          title: "Success",
          description: "Book borrowed successfully.",
        });

        router.push("/my-profile");
      } else {
        if (result.alreadyBorrowed) {
          setIsAlreadyBorrowed(true);
        }
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.log(error);

      toast({
        title: "Error",
        description: "Failed to borrow book.",
      });
    } finally {
      setBorrowing(false);
    }
  };

  return (
    <Button
      className="book-overview_btn"
      onClick={handleBorrowBook}
      disabled={borrowing || isAlreadyBorrowed}
    >
      <Image src="/icons/book.svg" alt="book" width={20} height={20} />

      <p className="font-bebas-neue text-xl text-dark-100">
        {borrowing
          ? "Borrowing..."
          : isAlreadyBorrowed
            ? "Already Borrowed"
            : "Borrow Book Request"}
      </p>
    </Button>
  );
};

export default BorrowBook;
