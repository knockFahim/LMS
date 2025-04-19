"use client";

import Image from "next/image";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { deleteUser } from "@/lib/admin/actions/user";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteUserButtonProps {
  userId: string;
  userName: string;
}

const DeleteUserButton = ({ userId, userName }: DeleteUserButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const result = await deleteUser(userId);

      if (result.success) {
        toast({
          title: "Success",
          description: "User deleted successfully",
        });
        setIsOpen(false);
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete user",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Something went wrong while deleting the user",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          className="cursor-pointer rounded-full p-1 transition-colors hover:bg-gray-100"
          title="Delete user"
        >
          <Image
            src="/icons/admin/trash.svg"
            width={20}
            height={20}
            className="object-contain"
            alt="delete"
          />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold text-dark-400">
            Delete User
          </DialogTitle>
          <DialogDescription className="text-center text-light-500">
            Are you sure you want to delete {userName}? This action cannot be
            undone.
            <br />
            <span className="mt-2 block font-semibold text-red-500">
              Note: Users with borrowed books cannot be deleted.
            </span>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-5">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="flex-1"
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            className="flex-1 bg-red-600 hover:bg-red-700"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteUserButton;
