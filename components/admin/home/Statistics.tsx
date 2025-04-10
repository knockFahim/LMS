import Image from "next/image";

import { cn } from "@/lib/utils";
import { getStatistics } from "@/lib/admin/actions/general";

interface StatCardProps {
  label: string;
  count: number;
  changeAmount: number;
  isStatIncrease: boolean;
}

const StatCard = ({
  label,
  count,
  changeAmount,
  isStatIncrease,
}: StatCardProps) => {
  return (
    <div className="stat">
      <div className="stat-info">
        <p className="stat-label">{label}</p>
        <div className="flex items-center gap-1">
          <Image
            src={
              isStatIncrease
                ? "/icons/admin/caret-up.svg"
                : "/icons/admin/caret-down.svg"
            }
            alt={isStatIncrease ? "caret-up" : "caret-down"}
            width={14}
            height={14}
            className="object-contain"
          />
          <p
            className={cn(!isStatIncrease ? "text-red-500" : "text-green-500")}
          >
            {Math.abs(changeAmount)}
          </p>
        </div>
      </div>

      <p className="stat-count">{count < 10 ? `0${count}` : count}</p>
    </div>
  );
};

const Statistics = async () => {
  const { data: stats } = await getStatistics();

  if (!stats) {
    throw new Error("Failed to fetch statistics");
  }

  // Calculate active books change compared to last week
  const activeBooksChange =
    stats?.borrowRecord.activeBorrowed -
    (stats?.borrowRecord.lastWeekActiveBorrowed || 0);

  return (
    <section className="flex min-w-fit flex-wrap gap-5">
      <StatCard
        label="Borrowed Books"
        count={stats?.borrowRecord.activeBorrowed || 0}
        changeAmount={activeBooksChange}
        isStatIncrease={activeBooksChange > 0}
      />
      <StatCard
        label="Total Users"
        count={stats?.user.total!}
        changeAmount={stats?.user.change!}
        isStatIncrease={stats?.user.change! > 0}
      />
      <StatCard
        label="Total Books"
        count={stats?.book.total!}
        changeAmount={stats?.book.change!}
        isStatIncrease={stats?.book.change! > 0}
      />
    </section>
  );
};

export default Statistics;
