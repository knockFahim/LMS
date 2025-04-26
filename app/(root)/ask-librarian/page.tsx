"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

import {
  createLibraryMessage,
  getUserLibraryMessages,
} from "@/lib/actions/libraryMessage";

const messageSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(5, { message: "Subject must be at least 5 characters long" })
    .max(255, { message: "Subject cannot exceed 255 characters" }),
  message: z
    .string()
    .trim()
    .min(10, { message: "Message must be at least 10 characters long" })
    .max(1000, { message: "Message cannot exceed 1000 characters" }),
});

export default function AskLibrarian() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      subject: "",
      message: "",
    },
  });

  // Fetch user messages on component mount
  useEffect(() => {
    const fetchMessages = async () => {
      if (!session?.user?.id) return;

      setLoading(true);
      try {
        const result = await getUserLibraryMessages(session.user.id);
        if (result.success) {
          setMessages(result.data);
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to load messages",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast({
          title: "Error",
          description: "Failed to load your messages",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [session?.user?.id]);

  const onSubmit = async (values: z.infer<typeof messageSchema>) => {
    if (!session?.user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to send a message",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await createLibraryMessage({
        userId: session.user.id,
        subject: values.subject,
        message: values.message,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Your message has been sent to the librarian",
        });

        form.reset();

        // Add the new message to the messages list
        setMessages([result.data, ...messages]);
      } else {
        throw new Error(result.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send your message",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to format message status
  const formatStatus = (status: string) => {
    switch (status) {
      case "UNREAD":
        return "Submitted";
      case "READ":
        return "Under Review";
      case "REPLIED":
        return "Answered";
      default:
        return status;
    }
  };

  // Helper function to get status badge class
  const getStatusClass = (status: string) => {
    switch (status) {
      case "UNREAD":
        return "bg-blue-100 text-blue-700";
      case "READ":
        return "bg-amber-100 text-amber-700";
      case "REPLIED":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="w-full">
      <div className="library">
        <p className="library-subtitle">Communication</p>
        <h1 className="library-title">Ask a Librarian</h1>
      </div>

      <div className="mt-20 flex flex-col gap-12 lg:flex-row">
        {/* Message Form */}
        <div className="flex-1 rounded-lg bg-dark-300 p-8">
          <h2 className="text-2xl font-semibold text-white">Send a Message</h2>
          <p className="mt-2 text-light-100">
            Have a question for the library staff? Send us a message and
            we&apos;ll get back to you as soon as possible.
          </p>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-6 space-y-4"
            >
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-light-100">Subject</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter a brief subject for your message"
                        className="form-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-light-100">Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter your message here"
                        className="form-input min-h-[150px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="form-btn mt-4"
                disabled={submitting}
              >
                {submitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </Form>
        </div>

        {/* Message History */}
        <div className="flex-1 rounded-lg bg-dark-300 p-8">
          <h2 className="text-2xl font-semibold text-white">Your Messages</h2>
          <p className="mt-2 text-light-100">
            View your message history and any responses from the library staff.
          </p>

          <div className="mt-6 flex flex-col space-y-4">
            {loading ? (
              <p className="text-center text-light-100">Loading messages...</p>
            ) : messages.length === 0 ? (
              <p className="text-center text-light-100">
                You haven&apos;t sent any messages yet.
              </p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className="rounded-lg border border-dark-600 bg-dark-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">
                      {message.subject}
                    </h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                        message.status
                      )}`}
                    >
                      {formatStatus(message.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-light-100">
                    {message.message}
                  </p>
                  <p className="mt-2 text-xs text-light-600">
                    Sent on{" "}
                    {dayjs(message.createdAt).format("MMMM D, YYYY h:mm A")}
                  </p>

                  {message.status === "REPLIED" && (
                    <div className="mt-4 rounded-lg border border-primary/20 bg-dark-300 p-4">
                      <h4 className="font-semibold text-primary">
                        Librarian&apos;s Response
                      </h4>
                      <p className="mt-2 text-sm text-light-100">
                        {message.adminResponse}
                      </p>
                      <p className="mt-2 text-xs text-light-600">
                        Responded on{" "}
                        {dayjs(message.updatedAt).format("MMMM D, YYYY h:mm A")}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
