import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import Loading from "@/components/admin/Loading";
import Statistics from "@/components/admin/home/Statistics";
import ErrorFallback from "@/components/admin/ErrorFallback";
import RecentBooks from "@/components/admin/home/RecentBooks";
import BorrowRequests from "@/components/admin/home/BorrowRequests";
import AccountRequests from "@/components/admin/home/AccountRequests";
import BookRequests from "@/components/admin/home/BookRequests";
import SearchRedirect from "@/components/admin/SearchRedirect";

const Page = async () => {
  return (
    <>
      {/* Client component to handle search redirects */}
      <SearchRedirect />

      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<Loading />}>
          <Statistics />
        </Suspense>
      </ErrorBoundary>

      <div className="mt-5 flex gap-5">
        <div className="flex flex-1 flex-col gap-5">
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<Loading />}>
              <BorrowRequests />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<Loading />}>
              <BookRequests />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<Loading />}>
              <AccountRequests />
            </Suspense>
          </ErrorBoundary>
        </div>

        <div className="flex-1">
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<Loading />}>
              <RecentBooks />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </>
  );
};

export default Page;
