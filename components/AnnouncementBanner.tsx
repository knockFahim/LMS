"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { getAnnouncements } from "@/lib/admin/actions/announcement";

const AnnouncementBanner = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [closed, setClosed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch announcements when component mounts
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        const result = await getAnnouncements({
          activeOnly: true,
          limit: 10, // Fetch up to 10 active announcements
        });

        if (result.success && result.data.length > 0) {
          setAnnouncements(result.data);
        }
      } catch (error) {
        console.error("Error fetching announcements:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  // Handle auto-rotation in a separate effect that depends on announcements
  useEffect(() => {
    if (announcements.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [announcements.length]);

  // Don't render anything if there are no announcements or if user closed the banner
  if (closed || loading || announcements.length === 0) return null;

  const currentAnnouncement = announcements[currentIndex];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="relative mt-4 w-full rounded-lg bg-blue-50 p-4 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900">
              {currentAnnouncement.title}
            </h3>
            <p className="mt-1 text-sm text-blue-800">
              {currentAnnouncement.content}
            </p>

            {currentAnnouncement.expiresAt && (
              <p className="mt-2 text-xs text-blue-600">
                Expires on{" "}
                {dayjs(currentAnnouncement.expiresAt).format("MMMM D, YYYY")}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {announcements.length > 1 && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() =>
                    setCurrentIndex((prev) =>
                      prev === 0 ? announcements.length - 1 : prev - 1
                    )
                  }
                  className="rounded-full p-1 hover:bg-blue-100"
                  aria-label="Previous announcement"
                >
                  <ChevronLeft size={16} className="text-blue-700" />
                </button>

                <span className="text-xs text-blue-700">
                  {currentIndex + 1}/{announcements.length}
                </span>

                <button
                  onClick={() =>
                    setCurrentIndex((prev) => (prev + 1) % announcements.length)
                  }
                  className="rounded-full p-1 hover:bg-blue-100"
                  aria-label="Next announcement"
                >
                  <ChevronRight size={16} className="text-blue-700" />
                </button>
              </div>
            )}

            <button
              onClick={() => setClosed(true)}
              className="rounded-full p-1 hover:bg-blue-100"
              aria-label="Close"
            >
              <X size={16} className="text-blue-700" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AnnouncementBanner;
