import Link from "next/link";
import dayjs from "dayjs";
import { getBookRequests } from "@/lib/actions/bookRequest";

const BookRequests = async () => {
  try {
    // Fetch the 3 most recent book requests
    const {
      data: requests,
      success,
      error,
    } = await getBookRequests({
      limit: 3,
    });

    if (!success) {
      console.error("Error fetching recent book requests:", error);
      return (
        <section className="w-full rounded-2xl bg-white p-5">
          <div className="flex justify-between">
            <h2 className="text-xl font-semibold">Recent Book Requests</h2>
            <Link
              href="/admin/book-requests"
              className="text-sm font-medium text-primary-admin"
            >
              View All
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Failed to load recent requests.
          </p>
        </section>
      );
    }

    if (!requests || requests.length === 0) {
      return (
        <section className="w-full rounded-2xl bg-white p-5">
          <div className="flex justify-between">
            <h2 className="text-xl font-semibold">Recent Book Requests</h2>
            <Link
              href="/admin/book-requests"
              className="text-sm font-medium text-primary-admin"
            >
              View All
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">No recent book requests.</p>
        </section>
      );
    }

    return (
      <section className="w-full rounded-2xl bg-white p-5">
        <div className="flex justify-between">
          <h2 className="text-xl font-semibold">Recent Book Requests</h2>
          <Link
            href="/admin/book-requests"
            className="text-sm font-medium text-primary-admin"
          >
            View All
          </Link>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex flex-col rounded-lg border border-light-300 bg-light-300 p-4"
            >
              <div className="flex justify-between">
                <h3 className="font-semibold line-clamp-1">{request.title}</h3>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    request.status === "PENDING"
                      ? "bg-[#FEF3C7] text-[#B54708]"
                      : request.status === "APPROVED"
                        ? "bg-[#D1FAE5] text-[#065F46]"
                        : "bg-[#FEE2E2] text-[#B91C1C]"
                  }`}
                >
                  {request.status.charAt(0) +
                    request.status.slice(1).toLowerCase()}
                </span>
              </div>

              <p className="mt-1 text-xs text-light-500">
                {request.author
                  ? `By ${request.author}`
                  : "Author not specified"}
              </p>

              <div className="mt-3 flex justify-between text-xs">
                <p className="text-light-500">
                  Requested by: {request.user.fullname}
                </p>
                <p className="text-light-500">
                  {dayjs(request.createdAt).format("MMM DD, YYYY")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  } catch (error) {
    console.error("Unexpected error in BookRequests component:", error);
    return (
      <section className="w-full rounded-2xl bg-white p-5">
        <div className="flex justify-between">
          <h2 className="text-xl font-semibold">Recent Book Requests</h2>
          <Link
            href="/admin/book-requests"
            className="text-sm font-medium text-primary-admin"
          >
            View All
          </Link>
        </div>
        <p className="mt-4 text-sm text-red-500">
          An error occurred while loading requests.
        </p>
      </section>
    );
  }
};

export default BookRequests;
