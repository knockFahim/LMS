"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";

import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { toast } from "@/hooks/use-toast";
import { createReview, canUserReviewBook } from "@/lib/actions/review";

interface ReviewFormProps {
  bookId: string;
  userId: string;
}

const ReviewForm = ({ bookId, userId }: ReviewFormProps) => {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [canReview, setCanReview] = useState<boolean | null>(null);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);

  // Check if user can review this book (has borrowed and returned it)
  useEffect(() => {
    const checkEligibility = async () => {
      setIsCheckingEligibility(true);
      try {
        const result = await canUserReviewBook(userId, bookId);
        setCanReview(result.success && result.canReview);
      } catch (error) {
        console.error("Error checking review eligibility:", error);
        setCanReview(false);
      } finally {
        setIsCheckingEligibility(false);
      }
    };

    if (userId) {
      checkEligibility();
    }
  }, [userId, bookId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a rating before submitting your review.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createReview({
        bookId,
        userId,
        rating,
        comment: comment.trim() || undefined,
      });

      if (result.success) {
        toast({
          title: "Review submitted",
          description: "Thank you for your review!",
        });
        setRating(0);
        setComment("");
        // Refresh the page to show the new review
        router.refresh();
      } else {
        toast({
          title: "Error",
          description:
            result.error || "Failed to submit review. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingEligibility) {
    return (
      <div className="py-4 text-center text-light-100">
        Checking review eligibility...
      </div>
    );
  }

  if (canReview === false) {
    return (
      <div className="rounded-lg bg-dark-300 p-5">
        <p className="text-center text-light-100">
          You can only review books that you have borrowed and returned.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg bg-dark-300 p-5">
      <h4 className="mb-4 text-xl font-semibold text-light-100">
        Write a Review
      </h4>

      <div className="mb-4 flex items-center">
        <p className="mr-3 text-light-100">Rating:</p>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`size-6 cursor-pointer transition-colors ${
                (hoverRating || rating) >= star
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-400"
              }`}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
            />
          ))}
        </div>
        <span className="ml-2 text-light-100">{rating > 0 ? rating : ""}</span>
      </div>

      <div className="mb-4">
        <Textarea
          placeholder="Share your thoughts about this book (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="border-none bg-dark-200 text-light-100"
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || rating === 0}
        className="book-overview_btn w-full"
      >
        {isSubmitting ? "Submitting..." : "Submit Review"}
      </Button>
    </form>
  );
};

export default ReviewForm;
