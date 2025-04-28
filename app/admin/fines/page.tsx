"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import dayjs from "dayjs";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Pagination from "@/components/Pagination";
import { toast } from "@/hooks/use-toast";

import { getAllFines, markFineAsPaid, waiveFine } from "@/lib/actions/fines";
import { useSession } from "next-auth/react";

const formatCurrency = (amount: any) => {
  // Convert to number if it's a string, or default to 0 if it's null/undefined/NaN
  const numAmount = amount ? parseFloat(amount) : 0;
  // Check if it's a valid number after conversion
  return `${isNaN(numAmount) ? 0 : numAmount.toFixed(2)} BDT`;
};

const FineStatusBadge = ({ status }: { status: string }) => {
  switch (status.toUpperCase()) {
    case "PENDING":
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700">
          Pending
        </Badge>
      );
    case "PAID":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700">
          Paid
        </Badge>
      );
    case "WAIVED":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          Waived
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700">
          {status}
        </Badge>
      );
  }
};

const FineTypeLabel = ({ type }: { type: string }) => {
  switch (type.toUpperCase()) {
    case "OVERDUE":
      return <span className="text-amber-600">Overdue</span>;
    case "DAMAGE":
      return <span className="text-red-600">Damage</span>;
    case "LOST":
      return <span className="text-purple-600">Lost</span>;
    default:
      return <span>{type}</span>;
  }
};

const WaiveFineDialog = ({
  isOpen,
  onClose,
  onSubmit,
  fineId,
  amount,
  adminId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (fineId: string, reason: string) => Promise<void>;
  fineId: string;
  amount: number;
  adminId: string;
}) => {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for waiving the fine",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(reason);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Waive Fine</h3>
        <p className="mb-2">
          You are about to waive a fine of{" "}
          <strong>{formatCurrency(amount)}</strong>.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reason" className="mb-2 block text-sm font-medium">
              Reason for waiving the fine
            </label>
            <textarea
              id="reason"
              className="w-full rounded-md border p-2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for waiving the fine"
              required
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Confirm Waive"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminFinesPage = () => {
  const session = useSession();
  const searchParams = useSearchParams();
  const query = searchParams.get("query") || undefined;
  const status = searchParams.get("status") || undefined;
  const page = Number(searchParams.get("page") || "1");

  const [fines, setFines] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [waiveDialogOpen, setWaiveDialogOpen] = useState(false);
  const [selectedFine, setSelectedFine] = useState<any>(null);

  useEffect(() => {
    const fetchFines = async () => {
      try {
        setLoading(true);
        const result = await getAllFines({ status, page });
        if (result.success) {
          setFines(result.data);
          setMetadata(result.metadata);
          setSummary(result.summary);
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to fetch fines",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching fines:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFines();
  }, [status, page]);

  const handleMarkAsPaid = async (fineId: string) => {
    try {
      const result = await markFineAsPaid(fineId);
      if (result.success) {
        toast({
          title: "Success",
          description: "Fine marked as paid successfully",
        });

        // Update the local state to reflect the change
        setFines(
          fines.map((fine) =>
            fine.fine.id === fineId
              ? {
                  ...fine,
                  fine: {
                    ...fine.fine,
                    status: "PAID",
                    paidAt: new Date().toISOString(),
                  },
                }
              : fine
          )
        );
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to mark fine as paid",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error marking fine as paid:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const openWaiveDialog = (fine: any) => {
    setSelectedFine(fine);
    setWaiveDialogOpen(true);
  };

  const closeWaiveDialog = () => {
    setSelectedFine(null);
    setWaiveDialogOpen(false);
  };

  const handleWaiveFine = async (reason: string) => {
    if (!selectedFine || !session.data?.user.id) return;

    try {
      const result = await waiveFine({
        fineId: selectedFine.fine.id,
        adminId: session.data.user.id,
        reason,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Fine waived successfully",
        });

        // Update the local state to reflect the change
        setFines(
          fines.map((fine) =>
            fine.fine.id === selectedFine.fine.id
              ? {
                  ...fine,
                  fine: {
                    ...fine.fine,
                    status: "WAIVED",
                    waivedAt: new Date().toISOString(),
                    waivedBy: session.data.user.id,
                  },
                }
              : fine
          )
        );

        closeWaiveDialog();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to waive fine",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error waiving fine:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="w-full rounded-2xl bg-white p-7">
      <h2 className="text-xl font-semibold">Fines Management</h2>

      <div className="mt-5 grid grid-cols-4 gap-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Pending Fines</h3>
          <p className="mt-2 text-2xl font-semibold text-amber-600">
            {summary ? formatCurrency(summary.totalPending) : "Loading..."}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Paid Fines</h3>
          <p className="mt-2 text-2xl font-semibold text-green-600">
            {summary ? formatCurrency(summary.totalPaid) : "Loading..."}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Waived Fines</h3>
          <p className="mt-2 text-2xl font-semibold text-blue-600">
            {summary ? formatCurrency(summary.totalWaived) : "Loading..."}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Total Fines</h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {summary ? formatCurrency(summary.grandTotal) : "Loading..."}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex space-x-2">
          <Button
            variant={!status ? "default" : "outline"}
            onClick={() => {
              window.location.href = `/admin/fines?page=1`;
            }}
          >
            All
          </Button>
          <Button
            variant={status === "pending" ? "default" : "outline"}
            onClick={() => {
              window.location.href = `/admin/fines?status=pending&page=1`;
            }}
          >
            Pending
          </Button>
          <Button
            variant={status === "paid" ? "default" : "outline"}
            onClick={() => {
              window.location.href = `/admin/fines?status=paid&page=1`;
            }}
          >
            Paid
          </Button>
          <Button
            variant={status === "waived" ? "default" : "outline"}
            onClick={() => {
              window.location.href = `/admin/fines?status=waived&page=1`;
            }}
          >
            Waived
          </Button>
        </div>
      </div>

      <div className="mt-7 w-full overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10">
            <p>Loading fines...</p>
          </div>
        ) : (
          <Table className="overflow-hidden">
            <TableHeader>
              <TableRow className="h-14 border-none bg-light-300">
                <TableHead className="w-40">Fine Type</TableHead>
                <TableHead className="w-64">Book</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fines.length > 0 ? (
                fines.map((fine) => (
                  <TableRow key={fine.fine.id} className="border-b-dark-100/5">
                    <TableCell className="font-medium">
                      <FineTypeLabel type={fine.fine.fineType} />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-dark-400">
                          {fine.book.title}
                        </p>
                        <p className="text-xs text-dark-300">
                          {fine.book.author}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-dark-400">
                          {fine.user.fullname}
                        </p>
                        <p className="text-xs text-dark-300">
                          ID: {fine.user.universityId}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(fine.fine.amount)}
                    </TableCell>
                    <TableCell>
                      {dayjs(fine.fine.createdAt).format("MMM DD, YYYY")}
                    </TableCell>
                    <TableCell>
                      <FineStatusBadge status={fine.fine.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {fine.fine.status === "PENDING" && (
                        <div className="flex justify-end space-x-2">
                          <Button
                            size="sm"
                            className="bg-green-600 text-white hover:bg-green-700"
                            onClick={() => handleMarkAsPaid(fine.fine.id)}
                          >
                            Mark as Paid
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            onClick={() => openWaiveDialog(fine)}
                          >
                            Waive
                          </Button>
                        </div>
                      )}
                      {fine.fine.status !== "PENDING" && (
                        <div className="flex justify-end">
                          <Button variant="ghost" size="sm" disabled>
                            {fine.fine.status === "PAID"
                              ? `Paid on ${dayjs(fine.fine.paidAt).format(
                                  "MMM DD, YYYY"
                                )}`
                              : fine.fine.status === "WAIVED"
                                ? `Waived on ${dayjs(fine.fine.waivedAt).format(
                                    "MMM DD, YYYY"
                                  )}`
                                : fine.fine.status}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="pt-10 text-center">
                    {status ? `No ${status} fines found` : "No fines found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {metadata && metadata.totalPages > 0 && (
        <div className="mt-8">
          <Pagination variant="light" hasNextPage={metadata.hasNextPage} />
        </div>
      )}

      {waiveDialogOpen && selectedFine && (
        <WaiveFineDialog
          isOpen={waiveDialogOpen}
          onClose={closeWaiveDialog}
          onSubmit={handleWaiveFine}
          fineId={selectedFine.fine.id}
          amount={selectedFine.fine.amount}
          adminId={session.data?.user.id || ""}
        />
      )}
    </section>
  );
};

export default AdminFinesPage;
