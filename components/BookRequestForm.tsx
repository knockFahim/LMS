"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { toast } from "@/hooks/use-toast";
import { bookRequestSchema } from "@/lib/validations";
import { createBookRequest } from "@/lib/actions/bookRequest";

interface Props {
  userId: string;
}

const BookRequestForm = ({ userId }: Props) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof bookRequestSchema>>({
    resolver: zodResolver(bookRequestSchema),
    defaultValues: {
      title: "",
      author: "",
      genre: "",
      description: "",
    },
  });

  async function onSubmit(values: z.infer<typeof bookRequestSchema>) {
    setIsSubmitting(true);

    try {
      // Log form values for debugging
      console.log("Submitting form with values:", values);

      const result = await createBookRequest({
        ...values,
        userId,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Your book request has been submitted.",
        });

        // Reset the form
        form.reset();

        // Redirect to profile page or refresh
        router.push("/my-profile");
        router.refresh();
      } else {
        console.error("Book request submission failed:", result.error);
        toast({
          title: "Error",
          description: result.error || "Failed to submit book request.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Exception in book request submission:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-6 text-white">Request a Book</h2>
      <div className="bg-dark-300 p-6 rounded-xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-light-200">Book Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter the book title"
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
              name="author"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-light-200">
                    Author (if known)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter the author's name"
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
              name="genre"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-light-200">
                    Genre/Category (if known)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="E.g., Fiction, Computer Science, etc."
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
              name="description"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-light-200">
                    Additional Details (optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide any additional details about the book you're requesting"
                      className="form-input min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="submit-btn w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Book Request"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default BookRequestForm;
