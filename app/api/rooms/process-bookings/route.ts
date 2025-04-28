import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { roomBookings } from "@/database/schema";
import { eq, and, lte, gte, isNull } from "drizzle-orm";

// This route is intended to be called by a scheduled task (e.g., cron job)
// to process no-shows and completed bookings
export async function POST(request: NextRequest) {
    try {
        const now = new Date();
        const results = { noShows: 0, completed: 0 };

        // Process no-shows
        // Find bookings that started more than 15 minutes ago but haven't been checked in
        const fifteenMinutesAgo = new Date(now);
        fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

        const uncheckedBookings = await db
            .select()
            .from(roomBookings)
            .where(
                and(
                    eq(roomBookings.status, "BOOKED"),
                    lte(roomBookings.startTime, fifteenMinutesAgo),
                    gte(roomBookings.endTime, now), // Only current bookings
                    isNull(roomBookings.checkinTime)
                )
            );

        // Mark them as NO_SHOW
        for (const booking of uncheckedBookings) {
            await db
                .update(roomBookings)
                .set({
                    status: "NO_SHOW",
                    updatedAt: now,
                })
                .where(eq(roomBookings.id, booking.id));
        }
        results.noShows = uncheckedBookings.length;

        // Process completed bookings
        // Find checked-in bookings that have passed their end time
        const completedBookings = await db
            .select()
            .from(roomBookings)
            .where(
                and(
                    eq(roomBookings.status, "CHECKED_IN"),
                    lte(roomBookings.endTime, now)
                )
            );

        // Mark them as COMPLETED
        for (const booking of completedBookings) {
            await db
                .update(roomBookings)
                .set({
                    status: "COMPLETED",
                    updatedAt: now,
                })
                .where(eq(roomBookings.id, booking.id));
        }
        results.completed = completedBookings.length;

        return NextResponse.json({
            success: true,
            processed: results,
        });
    } catch (error) {
        console.error("Error processing bookings:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to process bookings",
            },
            { status: 500 }
        );
    }
}
