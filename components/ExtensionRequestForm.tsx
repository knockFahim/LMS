"use client";

import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import dayjs from "dayjs";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { createExtensionRequest } from "@/lib/actions/extensionRequest";

const extensionRequestSchema = z.object({
  borrowRecordId: z.string().min(1, "Please select a book"),
  requestedDueDate: z
    .string()
    .min(1, "Please select a requested due date")
    .refine(
      (date) => dayjs(date).isAfter(dayjs(), "day"),
      "Due date must be in the future"
    ),
  reason: z
    .string()
    .max(500, { message: "Reason must be 500 characters or less" })
    .optional(),
});

type ExtensionRequestFormValues = z.infer<typeof extensionRequestSchema>;

interface ExtensionRequestFormProps {
  userId: string;
  borrowedBooks: BorrowedBook[];
  buttonVariant?: "default" | "outline";
}

export default function ExtensionRequestForm({
  userId,
  borrowedBooks,
  buttonVariant = "default",
}: ExtensionRequestFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BorrowedBook | null>(null);

  // Filter only books that are currently borrowed (not returned)
  const activeBorrowedBooks = borrowedBooks.filter(
    (book) => book.borrow.status === "BORROWED"
  );

  const form = useForm<ExtensionRequestFormValues>({
    resolver: zodResolver(extensionRequestSchema),
    defaultValues: {
      borrowRecordId: "",
      requestedDueDate: "",
      reason: "",
    },
  });

  // Get current due date of selected book
  const currentDueDate = selectedBook?.borrow?.dueDate || "";
  const formattedCurrentDueDate = currentDueDate
    ? dayjs(currentDueDate).format("MMMM D, YYYY")
    : "";

  const minDate = dayjs().add(1, "day").format("YYYY-MM-DD");
  const maxDate = dayjs().add(30, "days").format("YYYY-MM-DD"); // Maximum extension of 30 days

  // Handle book selection change
  const handleBookChange = (borrowRecordId: string) => {
    const book = activeBorrowedBooks.find(
      (book) => book.borrow.id === borrowRecordId
    );
    setSelectedBook(book || null);
  };

  const onSubmit = async (data: ExtensionRequestFormValues) => {
    try {
      setIsSubmitting(true);

      const result = await createExtensionRequest({
        borrowRecordId: data.borrowRecordId,
        userId,
        requestedDueDate: data.requestedDueDate,
        reason: data.reason,
      });

      if (result.success) {
        toast({
          title: "Extension Request Submitted",
          description: "Your request has been submitted and is pending review.",
        });

        form.reset();
        setIsOpen(false);
      } else {
        throw new Error(result.error || "Failed to submit extension request");
      }
    } catch (error: any) {
      console.error("Error submitting extension request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit extension request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const noActiveBorrowedBooks = activeBorrowedBooks.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={buttonVariant}
          size="sm"
          disabled={noActiveBorrowedBooks}
          className={
            buttonVariant === "outline"
              ? "border-primary text-primary hover:bg-primary hover:text-dark-100"
              : ""
          }
        >
          Request Extension
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Request Deadline Extension
          </DialogTitle>
        </DialogHeader>

        {noActiveBorrowedBooks ? (
          <div className="mt-2 rounded-md bg-amber-50 p-3">
            <p className="text-sm text-amber-600">
              You don't have any active borrowed books to extend.
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 pt-4"
            >
              <FormField
                control={form.control}
                name="borrowRecordId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Book</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleBookChange(value);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="book-form_input">
                          <SelectValue placeholder="Select a book" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeBorrowedBooks.map((book) => (
                          <SelectItem
                            key={book.borrow.id}
                            value={book.borrow.id}
                          >
                            {book.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedBook && (
                <div className="rounded-md bg-dark-300/10 p-3">
                  <p className="text-sm text-dark-400">
                    <span className="font-medium">Current Due Date:</span>{" "}
                    {formattedCurrentDueDate}
                  </p>
                  <p className="mt-2 text-xs text-amber-600">
                    Note: You can request a maximum of 2 deadline extensions per
                    month.
                  </p>
                </div>
              )}

              <FormField
                control={form.control}
                name="requestedDueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requested Due Date</FormLabel>
                    <FormControl>
                      <Input
                        className="book-form_input"
                        type="date"
                        min={minDate}
                        max={maxDate}
                        disabled={!selectedBook}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Select a new due date (maximum 30 days from today)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        className="book-form_input min-h-[120px] resize-none"
                        placeholder="Explain why you need more time to return the book"
                        disabled={!selectedBook}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="mr-2"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-dark-100 hover:bg-primary/90"
                  disabled={isSubmitting || !selectedBook}
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
