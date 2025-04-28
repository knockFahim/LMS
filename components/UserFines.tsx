"use client";

import dayjs from "dayjs";
import { useState, useEffect } from "react";
import { getUserFines } from "@/lib/actions/fines";
import { toast } from "@/hooks/use-toast";
import { Button } from "./ui/button";

interface UserFinesProps {
  userId: string;
}

const formatCurrency = (amount: any) => {
  // Convert to number if it's a string, or default to 0 if it's null/undefined/NaN
  const numAmount = amount ? parseFloat(amount) : 0;
  // Check if it's a valid number after conversion
  return `${isNaN(numAmount) ? 0 : numAmount.toFixed(2)} BDT`;
};

const FineStatusBadge = ({ status }: { status: string }) => {
  const statusClass =
    {
      PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
      PAID: "bg-green-50 text-green-700 border border-green-200",
      WAIVED: "bg-blue-50 text-blue-700 border border-blue-200",
    }[status] || "bg-gray-50 text-gray-700 border border-gray-200";

  return (
    <span
      className={`inline-block rounded-md px-2 py-1 text-xs font-medium ${statusClass}`}
    >
      {status === "PENDING" ? "Pending" : status === "PAID" ? "Paid" : "Waived"}
    </span>
  );
};

const FineTypeLabel = ({ type }: { type: string }) => {
  const typeStyles =
    {
      OVERDUE: "text-amber-600",
      DAMAGE: "text-red-600",
      LOST: "text-purple-600",
    }[type] || "text-gray-600";

  return <span className={typeStyles}>{type}</span>;
};

const UserFines = ({ userId }: UserFinesProps) => {
  const [fines, setFines] = useState<any[]>([]);
  const [totalUnpaidFines, setTotalUnpaidFines] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFines = async () => {
      try {
        setLoading(true);
        const result = await getUserFines(userId);

        if (result.success) {
          setFines(result.data);
          setTotalUnpaidFines(result.totalUnpaid);
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to fetch fines",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching user fines:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred while fetching your fines",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFines();
  }, [userId]);

  const pendingFines = fines.filter((fine) => fine.fine.status === "PENDING");
  const otherFines = fines.filter((fine) => fine.fine.status !== "PENDING");

  if (loading) {
    return (
      <div className="mt-4 rounded-lg border p-4">
        <p className="text-center">Loading fines information...</p>
      </div>
    );
  }

  if (fines.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-green-100 bg-green-50 p-4">
        <p className="text-center text-green-800">
          You don't have any fines. Keep returning books on time!
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-6">
      {totalUnpaidFines > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-row justify-between">
            <div>
              <h3 className="font-semibold text-amber-800">
                Outstanding Fines
              </h3>
              <p className="text-sm text-amber-800">
                You have pending fines that must be paid to restore your
                borrowing privileges.
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-amber-800">
                {formatCurrency(totalUnpaidFines)}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-sm text-amber-700">
              <strong>How to pay:</strong> Please visit the circulation desk
              during library hours to pay your fines. Acceptable payment
              methods: Cash.
            </p>
          </div>
        </div>
      )}

      {pendingFines.length > 0 && (
        <>
          <div>
            <h3 className="mb-3 text-lg font-semibold">Pending Fines</h3>
            <div className="rounded-lg border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-light-300">
                  <tr>
                    <th className="py-3 pl-4 pr-3 text-left text-xs font-medium text-dark-400 sm:pl-6">
                      Fine Type
                    </th>
                    <th className="p-3 text-left text-xs font-medium text-dark-400">
                      Book
                    </th>
                    <th className="p-3 text-left text-xs font-medium text-dark-400">
                      Amount
                    </th>
                    <th className="p-3 text-left text-xs font-medium text-dark-400">
                      Date
                    </th>
                    <th className="p-3 text-left text-xs font-medium text-dark-400">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {pendingFines.map((fine) => (
                    <tr key={fine.fine.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 font-medium sm:pl-6">
                        <FineTypeLabel type={fine.fine.fineType} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-dark-300">
                        {fine.book.title}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-dark-400">
                        {formatCurrency(fine.fine.amount)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-dark-300">
                        {dayjs(fine.fine.createdAt).format("MMM DD, YYYY")}
                      </td>
                      <td className="px-3 py-4 text-sm text-dark-300">
                        <span className="line-clamp-2">
                          {fine.fine.description}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {otherFines.length > 0 && (
        <>
          <div>
            <h3 className="mb-3 text-lg font-semibold">Payment History</h3>
            <div className="rounded-lg border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-light-300">
                  <tr>
                    <th className="py-3 pl-4 pr-3 text-left text-xs font-medium text-dark-400 sm:pl-6">
                      Fine Type
                    </th>
                    <th className="p-3 text-left text-xs font-medium text-dark-400">
                      Book
                    </th>
                    <th className="p-3 text-left text-xs font-medium text-dark-400">
                      Amount
                    </th>
                    <th className="p-3 text-left text-xs font-medium text-dark-400">
                      Status
                    </th>
                    <th className="p-3 text-left text-xs font-medium text-dark-400">
                      Resolved Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {otherFines.map((fine) => (
                    <tr key={fine.fine.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 font-medium sm:pl-6">
                        <FineTypeLabel type={fine.fine.fineType} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-dark-300">
                        {fine.book.title}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-dark-400">
                        {formatCurrency(fine.fine.amount)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-dark-300">
                        <FineStatusBadge status={fine.fine.status} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-dark-300">
                        {fine.fine.status === "PAID"
                          ? dayjs(fine.fine.paidAt).format("MMM DD, YYYY")
                          : dayjs(fine.fine.waivedAt).format("MMM DD, YYYY")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="font-semibold">Library Fine Policies</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
          <li>Book items: 5.00 BDT per calendar day</li>
          <li>One-hour loan items: 5.00 BDT per hour</li>
          <li>Audio Visual items: 10.00 BDT per calendar day</li>
          <li>Items not returned within 6 weeks are considered lost</li>
          <li>
            Lost items must be replaced with a new copy, latest edition, or pay
            twice the current market price
          </li>
          <li>Borrowing privileges are suspended until all fines are paid</li>
        </ul>
      </div>
    </div>
  );
};

export default UserFines;
