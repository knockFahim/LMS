"use client";

import { useEffect } from "react";
import {
  updateUserBorrowingStatus,
  checkUserBorrowingEligibility,
} from "@/lib/actions/fines";
import { toast } from "@/hooks/use-toast";

// This component updates the user's borrowing status after the page renders
// preventing the revalidatePath error during server component rendering
interface BorrowingStatusUpdaterProps {
  userId: string;
}

const BorrowingStatusUpdater = ({ userId }: BorrowingStatusUpdaterProps) => {
  useEffect(() => {
    // Update user borrowing status and show relevant notifications
    const updateStatus = async () => {
      // First check eligibility to get detailed information
      const eligibilityCheck = await checkUserBorrowingEligibility(userId);

      // Update the user borrowing status in the database
      const result = await updateUserBorrowingStatus(userId);

      // Show notifications based on the eligibility check and action performed
      if (result.success) {
        if (result.action === "blocked") {
          // If user was blocked, show the appropriate notification based on the reason
          if (eligibilityCheck.overdueCount > 0) {
            toast({
              title: "Borrowing Privileges Suspended",
              description: `You have ${eligibilityCheck.overdueCount} overdue book(s). Return them to restore your borrowing privileges.`,
              variant: "destructive",
            });
          } else if (eligibilityCheck.fineCount > 0) {
            toast({
              title: "Borrowing Privileges Suspended",
              description: `You have unpaid fines totaling ${eligibilityCheck.totalFines} BDT. Pay them to restore your borrowing privileges.`,
              variant: "destructive",
            });
          }
        } else if (result.action === "unblocked") {
          // User was unblocked, show a success message
          toast({
            title: "Borrowing Privileges Restored",
            description:
              "You are now eligible to borrow books from the library.",
          });
        } else if (
          !eligibilityCheck.isEligible &&
          eligibilityCheck.shouldBlock
        ) {
          // User is approved but not eligible for borrowing due to overdue items
          if (eligibilityCheck.overdueCount > 0) {
            toast({
              title: "Action Required",
              description: `You have ${eligibilityCheck.overdueCount} overdue book(s). Please return them soon to avoid suspension of your borrowing privileges.`,
              variant: "destructive",
            });
          } else if (eligibilityCheck.fineCount > 0) {
            toast({
              title: "Action Required",
              description: `You have unpaid fines totaling ${eligibilityCheck.totalFines} BDT. Please pay them soon to avoid suspension of your borrowing privileges.`,
              variant: "destructive",
            });
          }
        }
      }
    };

    updateStatus();
    // Only run this effect once when the component mounts
  }, [userId]);

  // This component doesn't render anything
  return null;
};

export default BorrowingStatusUpdater;
