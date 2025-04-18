import dayjs from "dayjs";
import Link from "next/link";
import Image from "next/image";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import config from "@/lib/config";
import Pagination from "@/components/Pagination";
import { getUsers } from "@/lib/admin/actions/user";
import RoleMenu from "@/components/admin/RoleMenu";

const Page = async ({ searchParams }: PageProps) => {
  // Fix: properly await searchParams before using its properties
  const query = (await searchParams).query || "";
  const sort = ((await searchParams).sort as string) || "newest";
  const page = Number((await searchParams).page) || 1;

  const { data: allRecords, metadata } = await getUsers({
    query,
    sort,
    page,
  });

  return (
    <section className="w-full rounded-2xl bg-white p-7">
      <h2 className="text-xl font-semibold">All Users</h2>

      <div className="mt-7 w-full overflow-hidden">
        <Table className="overflow-hidden">
          <TableHeader>
            <TableRow className="h-14 border-none bg-light-300">
              <TableHead className="w-72">Name</TableHead>
              <TableHead>Date Joined</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>University ID No</TableHead>
              <TableHead>University ID Card</TableHead>
              <TableHead>Books Borrowed</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {allRecords?.length > 0 ? (
              allRecords!.map(({ user, totalBorrowedBooks }) => (
                <TableRow
                  key={user.id}
                  className="border-b-dark-100/5 text-sm font-medium"
                >
                  <TableCell className="text-dark-200">
                    {user.fullname}
                  </TableCell>
                  <TableCell className="text-dark-200">
                    {dayjs(user.createdAt).format("MMM DD, YYYY")}
                  </TableCell>
                  <TableCell>
                    <RoleMenu
                      userId={user.id}
                      initialRole={user.role!.toLowerCase()}
                    />
                  </TableCell>

                  <TableCell className="text-dark-200">
                    {user.universityId}
                  </TableCell>
                  <TableCell className="text-blue-100">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`${config.env.imagekit.urlEndpoint}${user.universityCard}`}
                        target="_blank"
                      >
                        View ID Card
                      </Link>
                      <Image
                        src="/icons/admin/link.svg"
                        width={14}
                        height={14}
                        className="object-contain"
                        alt="delete"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="w-24 text-dark-200">
                    {totalBorrowedBooks}
                  </TableCell>
                  <TableCell className="flex justify-center">
                    <Image
                      src="/icons/admin/trash.svg"
                      width={20}
                      height={20}
                      className="object-contain"
                      alt="delete"
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="pt-10 text-center">
                  No records found
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
