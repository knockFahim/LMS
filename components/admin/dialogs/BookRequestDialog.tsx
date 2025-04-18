"use client";

import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { updateBookRequestStatus } from "@/lib/actions/bookRequest";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  bookRequest: BookRequest;
  trigger: React.ReactNode;
}

const BookRequestDialog = ({ bookRequest, trigger }: Props) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState(bookRequest.status);
  const [adminNote, setAdminNote] = useState(bookRequest.adminNote || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const result = await updateBookRequestStatus({
        requestId: bookRequest.id,
        status: status as "PENDING" | "APPROVED" | "REJECTED",
        adminNote: adminNote,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Book request updated successfully",
        });
        setIsOpen(false);
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update book request",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Book Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <Label htmlFor="title">Book Title</Label>
            <div className="text-sm font-medium" id="title">
              {bookRequest.title}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="author">Author</Label>
              <div className="text-sm" id="author">
                {bookRequest.author || "Not specified"}
              </div>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="genre">Genre</Label>
              <div className="text-sm" id="genre">
                {bookRequest.genre || "Not specified"}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <div className="text-sm leading-relaxed" id="description">
              {bookRequest.description || "No description provided"}
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as any)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="note">Admin Note</Label>
            <Textarea
              id="note"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Add a note (optional)"
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookRequestDialog;