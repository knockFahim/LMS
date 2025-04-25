"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { Star } from "lucide-react";

import { getBookReviews } from "@/lib/actions/review";
import Avatar from "@/components/Avatar";

interface BookReviewsProps {
  bookId: string;
}

type ReviewWithUser = {
  id: string;
  userId: string;
  bookId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    fullname: string;
  };
};

const BookReviews = ({ bookId }: BookReviewsProps) => {
  const [reviews, setReviews] = useState<ReviewWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      setIsLoading(true);
      try {
        const result = await getBookReviews(bookId);
        if (result.success) {
          setReviews(result.data);
        } else {
          setError(result.error || "Failed to fetch reviews");
        }
      } catch (err) {
        console.error("Error fetching reviews:", err);
        setError("An unexpected error occurred while fetching reviews");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [bookId]);

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <p className="text-light-100">Loading reviews...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-light-100">Error: {error}</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-light-100">
          No reviews yet. Be the first to review this book!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-lg bg-dark-300 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center">
              <Avatar size="sm" name={review.user.fullname} />
              <span className="ml-2 font-medium text-light-100">
                {review.user.fullname}
              </span>
            </div>
            <span className="text-sm text-light-600">
              {dayjs(review.createdAt).format("MMM DD, YYYY")}
            </span>
          </div>

          <div className="mb-2 flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`size-4 ${
                  star <= review.rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-400"
                }`}
              />
            ))}
            <span className="ml-2 text-light-100">{review.rating}/5</span>
          </div>

          {review.comment && (
            <p className="mt-2 whitespace-pre-wrap text-light-100">
              {review.comment}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default BookReviews;
