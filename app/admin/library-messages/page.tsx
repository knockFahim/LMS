"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import dayjs from "dayjs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  getLibraryMessages,
  markMessageAsRead,
  replyToLibraryMessage,
} from "@/lib/actions/libraryMessage";
import { toast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Search from "@/components/admin/Search";
import Pagination from "@/components/Pagination";

// Reply form schema
const replySchema = z.object({
  response: z
    .string()
    .trim()
    .min(10, { message: "Response must be at least 10 characters long" })
    .max(2000, { message: "Response cannot exceed 2000 characters" }),
});

export default function LibraryMessages() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State variables
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [messageResponse, setMessageResponse] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [metadata, setMetadata] = useState({
    totalPages: 1,
    hasNextPage: false,
    currentPage: 1,
    totalCount: 0,
  });

  // Parse search parameters
  const query = searchParams.get("query") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const status = searchParams.get("status") || "";

  // Create form
  const form = useForm<z.infer<typeof replySchema>>({
    resolver: zodResolver(replySchema),
    defaultValues: {
      response: "",
    },
  });

  // Function to fetch messages
  const fetchMessages = async () => {
    setLoading(true);
    try {
      const result = await getLibraryMessages({
        query,
        page,
        status,
      });

      if (result.success) {
        setMessages(result.data);
        setMetadata(result.metadata);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to fetch messages",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to fetch messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages on component mount or when params change
  useEffect(() => {
    fetchMessages();
  }, [query, page, status]);

  // Function to handle message viewing and marking as read
  const handleViewMessage = async (message: any) => {
    setSelectedMessage(message);
    setIsDialogOpen(true);

    // If the message is unread, mark it as read
    if (message.status === "UNREAD") {
      try {
        await markMessageAsRead(message.id);
        // Update the message in the list
        setMessages(
          messages.map((m) =>
            m.id === message.id ? { ...m, status: "READ" } : m
          )
        );
      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    }
  };

  // Function to handle replying to a message
  const onSubmitReply = async (values: z.infer<typeof replySchema>) => {
    if (!session?.user?.id || !selectedMessage) {
      toast({
        title: "Error",
        description: "You must be logged in to respond",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await replyToLibraryMessage({
        messageId: selectedMessage.id,
        adminId: session.user.id,
        adminResponse: values.response,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Your response has been sent",
        });

        // Update the messages list
        setMessages(
          messages.map((m) =>
            m.id === selectedMessage.id
              ? {
                  ...m,
                  status: "REPLIED",
                  adminResponse: values.response,
                  adminId: session.user.id,
                  updatedAt: new Date().toISOString(),
                }
              : m
          )
        );

        form.reset();
        setIsDialogOpen(false);
      } else {
        throw new Error(result.error || "Failed to send response");
      }
    } catch (error) {
      console.error("Error sending response:", error);
      toast({
        title: "Error",
        description: "Failed to send your response",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to format message status with color
  const formatStatus = (status: string) => {
    switch (status) {
      case "UNREAD":
        return <span className="font-medium text-blue-500">Unread</span>;
      case "READ":
        return <span className="font-medium text-amber-500">Read</span>;
      case "REPLIED":
        return <span className="font-medium text-green-500">Replied</span>;
      default:
        return <span>{status}</span>;
    }
  };

  // Helper function to get status filter options
  const statusFilters = [
    { value: "", label: "All Messages" },
    { value: "UNREAD", label: "Unread" },
    { value: "READ", label: "Read" },
    { value: "REPLIED", label: "Replied" },
  ];

  // Handle status filter change
  const handleStatusChange = (newStatus: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newStatus) {
      params.set("status", newStatus);
    } else {
      params.delete("status");
    }

    params.set("page", "1"); // Reset to first page
    router.push(`?${params.toString()}`);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark-400">Library Messages</h1>
      <p className="mt-1 text-light-500">
        View and respond to messages from library users
      </p>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
        <Search
          placeholder="Search by subject or message content"
          resetParams={["status"]}
          preserveParams={["status"]}
        />

        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-dark-200">Filter by status:</span>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  status === filter.value
                    ? "bg-primary-admin text-white"
                    : "bg-light-300 text-dark-400 hover:bg-light-400"
                }`}
                onClick={() => handleStatusChange(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages count */}
      <p className="mt-4 text-sm text-light-500">
        Showing {messages.length} of {metadata.totalCount} messages
      </p>

      {/* Messages List */}
      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="py-10 text-center">
            <p className="text-light-500">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-lg border border-light-300 bg-white p-10 text-center">
            <p className="text-dark-200">No messages found</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className="rounded-lg border border-light-300 bg-white p-6"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-dark-400">
                      {message.subject}
                    </h3>
                    {formatStatus(message.status)}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-light-500">
                    {message.message}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center text-sm text-light-500">
                    <span>
                      From: {message.user?.fullname || "Unknown User"}
                    </span>
                  </div>
                  <p className="text-xs text-light-500">
                    {dayjs(message.createdAt).format("MMMM D, YYYY h:mm A")}
                  </p>
                  <Button
                    onClick={() => handleViewMessage(message)}
                    className="view-btn mt-2"
                  >
                    {message.status === "REPLIED" ? "View Response" : "Respond"}
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {metadata.totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={metadata.currentPage}
            totalPages={metadata.totalPages}
            hasNextPage={metadata.hasNextPage}
          />
        </div>
      )}

      {/* Reply Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedMessage?.status === "REPLIED"
                ? "Message Response"
                : "Respond to Message"}
            </DialogTitle>
          </DialogHeader>

          {selectedMessage && (
            <div className="mt-4 space-y-6">
              {/* Message Details */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <h3 className="font-semibold text-dark-400">
                    From: {selectedMessage.user?.fullname || "Unknown User"}
                  </h3>
                  <p className="text-sm text-light-500">
                    {dayjs(selectedMessage.createdAt).format(
                      "MMMM D, YYYY h:mm A"
                    )}
                  </p>
                </div>
                <h4 className="font-semibold text-dark-400">
                  Subject: {selectedMessage.subject}
                </h4>
                <div className="rounded-md border border-light-300 bg-light-300 p-4 text-dark-400">
                  {selectedMessage.message}
                </div>
              </div>

              {/* Existing Response (if available) */}
              {selectedMessage.status === "REPLIED" ? (
                <div className="space-y-2">
                  <h3 className="font-semibold text-dark-400">
                    Your Response:
                  </h3>
                  <div className="rounded-md border border-green-100 bg-green-50 p-4 text-dark-400">
                    {selectedMessage.adminResponse}
                  </div>
                  <p className="text-xs text-light-500">
                    Responded on{" "}
                    {dayjs(selectedMessage.updatedAt).format(
                      "MMMM D, YYYY h:mm A"
                    )}
                  </p>
                </div>
              ) : (
                /* Response Form */
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmitReply)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="response"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Response</FormLabel>
                          <FormControl>
                            <Textarea
                              className="book-form_input min-h-[150px] resize-none"
                              placeholder="Type your response here..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-primary-admin hover:bg-primary-admin/90"
                        disabled={submitting}
                      >
                        {submitting ? "Sending..." : "Send Response"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
