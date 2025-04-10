"use client";

import { useState, useEffect } from "react";
import dayjs from "dayjs";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Pagination from "@/components/Pagination";
import AnnouncementDialog from "@/components/admin/dialogs/AnnouncementDialog";

import {
  getAnnouncements,
  updateAnnouncementStatus,
  deleteAnnouncement,
} from "@/lib/admin/actions/announcement";
import { toast } from "@/hooks/use-toast";

const Page = () => {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        const result = await getAnnouncements({ page });
        if (result.success) {
          setAnnouncements(result.data);
          setMetadata(result.metadata);
        }
      } catch (error) {
        console.error("Error fetching announcements:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [page]);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const result = await updateAnnouncementStatus({
        id,
        isActive: !currentStatus,
      });

      if (result.success) {
        setAnnouncements((prevAnnouncements) =>
          prevAnnouncements.map((announcement) =>
            announcement.id === id
              ? { ...announcement, isActive: !currentStatus }
              : announcement
          )
        );

        toast({
          title: "Success",
          description: `Announcement ${!currentStatus ? "activated" : "deactivated"} successfully`,
        });
      }
    } catch (error) {
      console.error("Error toggling announcement status:", error);
      toast({
        title: "Error",
        description: "Failed to update announcement status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this announcement?")) {
      try {
        const result = await deleteAnnouncement(id);

        if (result.success) {
          setAnnouncements((prevAnnouncements) =>
            prevAnnouncements.filter((announcement) => announcement.id !== id)
          );

          toast({
            title: "Success",
            description: "Announcement deleted successfully",
          });
        }
      } catch (error) {
        console.error("Error deleting announcement:", error);
        toast({
          title: "Error",
          description: "Failed to delete the announcement",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <section className="w-full rounded-2xl bg-white p-7">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Announcements</h2>
        <AnnouncementDialog
          onSuccess={(newAnnouncement) => {
            setAnnouncements((prev) => [newAnnouncement, ...prev]);
          }}
        />
      </div>

      <div className="mt-7 w-full overflow-hidden">
        <Table className="overflow-hidden">
          <TableHeader>
            <TableRow className="h-14 border-none bg-light-300">
              <TableHead className="w-72">Title</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Date Created</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  Loading announcements...
                </TableCell>
              </TableRow>
            ) : announcements.length > 0 ? (
              announcements.map((announcement) => (
                <TableRow
                  key={announcement.id}
                  className="border-b-dark-100/5 text-sm font-medium"
                >
                  <TableCell className="font-semibold text-dark-200">
                    {announcement.title}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-dark-200">
                    {announcement.content}
                  </TableCell>
                  <TableCell className="text-dark-200">
                    {dayjs(announcement.createdAt).format("MMM DD, YYYY")}
                  </TableCell>
                  <TableCell className="text-dark-200">
                    {announcement.expiresAt
                      ? dayjs(announcement.expiresAt).format("MMM DD, YYYY")
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        announcement.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {announcement.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleToggleStatus(
                          announcement.id,
                          announcement.isActive
                        )
                      }
                      className={
                        announcement.isActive
                          ? "border-yellow-200 bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
                          : "border-green-200 bg-green-50 text-green-600 hover:bg-green-100"
                      }
                    >
                      {announcement.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(announcement.id)}
                      className="border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      <Image
                        src="/icons/admin/trash.svg"
                        width={16}
                        height={16}
                        alt="Delete"
                      />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  No announcements found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-8">
        <Pagination variant="light" hasNextPage={metadata?.hasNextPage} />
      </div>
    </section>
  );
};

export default Page;
