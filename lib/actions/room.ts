"use server";

import { db } from "@/database/drizzle";
import { libraryRooms, roomBookings, users } from "@/database/schema";
import {
    and,
    eq,
    or,
    sql,
    not,
    exists,
    gte,
    lte,
    asc,
    desc,
    isNull,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { AVAILABLE_TIME_SLOTS, isValidTimeSlot } from "@/lib/roomTimeSlots";

export async function addRoom({
    roomNumber,
    capacity,
    roomType,
    description,
}: {
    roomNumber: string;
    capacity: number;
    roomType: "INDIVIDUAL_POD" | "GROUP_ROOM";
    description?: string;
}) {
    return db
        .insert(libraryRooms)
        .values({ roomNumber, capacity, roomType, description })
        .returning();
}

export async function editRoom({
    id,
    roomNumber,
    capacity,
    roomType,
    description,
}: {
    id: string;
    roomNumber: string;
    capacity: number;
    roomType?: "INDIVIDUAL_POD" | "GROUP_ROOM";
    description?: string;
}) {
    const updateValues: any = { roomNumber, capacity };
    if (roomType) updateValues.roomType = roomType;
    if (description !== undefined) updateValues.description = description;

    return db
        .update(libraryRooms)
        .set(updateValues)
        .where(eq(libraryRooms.id, id))
        .returning();
}

export async function deleteRoom(id: string) {
    return db.delete(libraryRooms).where(eq(libraryRooms.id, id)).returning();
}

export async function getAllRoomTypes() {
    const rooms = await db
        .select()
        .from(libraryRooms)
        .orderBy(asc(libraryRooms.roomNumber));

    return rooms;
}

export async function getAvailableRooms({
    startTime,
    endTime,
    roomType,
}: {
    startTime: Date;
    endTime: Date;
    roomType?: "INDIVIDUAL_POD" | "GROUP_ROOM";
}) {
    try {
        // Validate the date range
        const now = new Date();
        const maxBookingDate = new Date();
        maxBookingDate.setDate(now.getDate() + 7); // 7 days from now

        if (new Date(startTime) < now) {
            throw new Error("Cannot book a room in the past");
        }

        if (new Date(startTime) > maxBookingDate) {
            throw new Error(
                "Reservations can only be made up to 7 days in advance"
            );
        }

        // Temporarily disable time slot validation
        // if (!isValidTimeSlot(startTime, endTime)) {
        //     throw new Error(
        //         "Invalid time slot. Please select a valid time slot from the available options."
        //     );
        // }

        // Base query
        let query = db
            .select()
            .from(libraryRooms)
            .where(
                not(
                    exists(
                        db
                            .select()
                            .from(roomBookings)
                            .where(
                                and(
                                    eq(roomBookings.roomId, libraryRooms.id),
                                    not(eq(roomBookings.status, "CANCELLED")),
                                    or(
                                        and(
                                            lte(
                                                roomBookings.startTime,
                                                new Date(endTime)
                                            ),
                                            gte(
                                                roomBookings.endTime,
                                                new Date(startTime)
                                            )
                                        )
                                    )
                                )
                            )
                    )
                )
            );

        // Add room type filter if specified
        if (roomType) {
            query = query.where(eq(libraryRooms.roomType, roomType));
        }

        // Execute query
        const rooms = await query.orderBy(asc(libraryRooms.roomNumber));
        return rooms;
    } catch (error) {
        console.error("Error fetching available rooms:", error);
        throw error;
    }
}

export async function bookRoom({
    roomId,
    userId,
    startTime,
    endTime,
    notes,
}: {
    roomId: string;
    userId: string;
    startTime: Date;
    endTime: Date;
    notes?: string;
}) {
    try {
        // Validate booking dates
        const now = new Date();
        const maxBookingDate = new Date();
        maxBookingDate.setDate(now.getDate() + 7); // 7 days from now

        if (new Date(startTime) < now) {
            throw new Error("Cannot book a room in the past");
        }

        if (new Date(startTime) > maxBookingDate) {
            throw new Error(
                "Reservations can only be made up to 7 days in advance"
            );
        }

        // Validate time slots
        if (!isValidTimeSlot(startTime, endTime)) {
            throw new Error(
                "Invalid time slot. Please select a valid time slot."
            );
        }

        // Check for overlapping bookings by this user
        const overlappingBookings = await db
            .select()
            .from(roomBookings)
            .where(
                and(
                    eq(roomBookings.userId, userId),
                    not(eq(roomBookings.status, "CANCELLED")),
                    or(
                        and(
                            lte(roomBookings.startTime, new Date(endTime)),
                            gte(roomBookings.endTime, new Date(startTime))
                        )
                    )
                )
            );

        if (overlappingBookings.length > 0) {
            throw new Error(
                "You already have a booking that overlaps with this time."
            );
        }

        // Check for no-show history
        const noShowCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(roomBookings)
            .where(
                and(
                    eq(roomBookings.userId, userId),
                    eq(roomBookings.status, "NO_SHOW"),
                    gte(
                        roomBookings.startTime,
                        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    ) // Last 30 days
                )
            );

        if (noShowCount[0].count >= 3) {
            throw new Error(
                "Your booking privileges are suspended due to multiple no-shows. Please contact the library administrator."
            );
        }

        // Create the booking
        const result = await db
            .insert(roomBookings)
            .values({
                roomId,
                userId,
                startTime,
                endTime,
                notes,
                status: "BOOKED",
            })
            .returning();

        revalidatePath("/rooms");
        return result[0];
    } catch (error) {
        console.error("Error booking room:", error);
        throw error;
    }
}

export async function getUserBookings(userId: string) {
    return db
        .select({
            id: roomBookings.id,
            userId: roomBookings.userId,
            startTime: roomBookings.startTime,
            endTime: roomBookings.endTime,
            status: roomBookings.status,
            checkinTime: roomBookings.checkinTime,
            notes: roomBookings.notes,
            createdAt: roomBookings.createdAt,
            room: {
                id: libraryRooms.id,
                roomNumber: libraryRooms.roomNumber,
                capacity: libraryRooms.capacity,
                roomType: libraryRooms.roomType,
                description: libraryRooms.description,
            },
        })
        .from(roomBookings)
        .innerJoin(libraryRooms, eq(roomBookings.roomId, libraryRooms.id))
        .where(eq(roomBookings.userId, userId))
        .orderBy(desc(roomBookings.startTime));
}

export async function getAllBookings(options?: {
    startDate?: Date;
    endDate?: Date;
    roomType?: string;
    status?: string;
    page?: number;
    limit?: number;
}) {
    const {
        startDate,
        endDate,
        roomType,
        status,
        page = 1,
        limit = 20,
    } = options || {};

    let query = db
        .select({
            id: roomBookings.id,
            startTime: roomBookings.startTime,
            endTime: roomBookings.endTime,
            status: roomBookings.status,
            checkinTime: roomBookings.checkinTime,
            notes: roomBookings.notes,
            createdAt: roomBookings.createdAt,
            user: {
                id: users.id,
                fullname: users.fullname,
                email: users.email,
                universityId: users.universityId,
            },
            room: {
                id: libraryRooms.id,
                roomNumber: libraryRooms.roomNumber,
                capacity: libraryRooms.capacity,
                roomType: libraryRooms.roomType,
            },
        })
        .from(roomBookings)
        .innerJoin(libraryRooms, eq(roomBookings.roomId, libraryRooms.id))
        .innerJoin(users, eq(roomBookings.userId, users.id));

    // Apply filters
    if (startDate) {
        query = query.where(gte(roomBookings.startTime, startDate));
    }
    if (endDate) {
        query = query.where(lte(roomBookings.endTime, endDate));
    }
    if (roomType) {
        query = query.where(eq(libraryRooms.roomType, roomType));
    }
    if (status) {
        query = query.where(eq(roomBookings.status, status));
    }

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Get total count
    const totalQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(roomBookings);

    // Apply the same filters to count query
    let countQuery = totalQuery;
    if (startDate) {
        countQuery = countQuery.where(gte(roomBookings.startTime, startDate));
    }
    if (endDate) {
        countQuery = countQuery.where(lte(roomBookings.endTime, endDate));
    }
    if (roomType) {
        countQuery = countQuery.where(eq(libraryRooms.roomType, roomType));
    }
    if (status) {
        countQuery = countQuery.where(eq(roomBookings.status, status));
    }

    // Execute both queries
    const [bookings, totalResult] = await Promise.all([
        query.orderBy(desc(roomBookings.startTime)).limit(limit).offset(offset),
        countQuery,
    ]);

    const totalCount = totalResult[0]?.count || 0;

    return {
        bookings,
        metadata: {
            total: totalCount,
            pages: Math.ceil(totalCount / limit),
            page,
            limit,
        },
    };
}

export async function cancelBooking(bookingId: string, userId: string) {
    try {
        // Check if booking exists and belongs to user
        const booking = await db
            .select()
            .from(roomBookings)
            .where(
                and(
                    eq(roomBookings.id, bookingId),
                    eq(roomBookings.userId, userId)
                )
            )
            .limit(1);

        if (!booking.length) {
            throw new Error("Booking not found or does not belong to you");
        }

        // Cannot cancel a booking that has already started
        if (new Date(booking[0].startTime) < new Date()) {
            throw new Error("Cannot cancel a booking that has already started");
        }

        // Update booking status to CANCELLED
        await db
            .update(roomBookings)
            .set({
                status: "CANCELLED",
                updatedAt: new Date(),
            })
            .where(eq(roomBookings.id, bookingId));

        revalidatePath("/rooms");
        return { success: true };
    } catch (error) {
        console.error("Error cancelling booking:", error);
        throw error;
    }
}

export async function checkInBooking(bookingId: string, userId: string) {
    try {
        // Check if booking exists and belongs to user
        const booking = await db
            .select()
            .from(roomBookings)
            .where(
                and(
                    eq(roomBookings.id, bookingId),
                    eq(roomBookings.userId, userId),
                    eq(roomBookings.status, "BOOKED")
                )
            )
            .limit(1);

        if (!booking.length) {
            throw new Error(
                "Booking not found, already checked-in, or does not belong to you"
            );
        }

        const bookingStart = new Date(booking[0].startTime);
        const now = new Date();

        // Can only check in starting 15 minutes before booking time
        const fifteenMinutesBefore = new Date(bookingStart);
        fifteenMinutesBefore.setMinutes(fifteenMinutesBefore.getMinutes() - 15);

        if (now < fifteenMinutesBefore) {
            throw new Error(
                "Cannot check in more than 15 minutes before your booking time"
            );
        }

        // Update booking status to CHECKED_IN
        await db
            .update(roomBookings)
            .set({
                status: "CHECKED_IN",
                checkinTime: now,
                updatedAt: now,
            })
            .where(eq(roomBookings.id, bookingId));

        revalidatePath("/rooms");
        return { success: true };
    } catch (error) {
        console.error("Error checking in:", error);
        throw error;
    }
}

export async function processNoShows() {
    try {
        const now = new Date();

        // Find bookings that have passed their start time by 15 minutes without check-in
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

        return {
            success: true,
            processed: uncheckedBookings.length,
        };
    } catch (error) {
        console.error("Error processing no-shows:", error);
        return {
            success: false,
            error: error.message,
        };
    }
}

export async function hasUserReachedBookingLimit(userId: string) {
    try {
        // Get count of active future bookings
        const bookingCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(roomBookings)
            .where(
                and(
                    eq(roomBookings.userId, userId),
                    gte(roomBookings.startTime, new Date()),
                    or(
                        eq(roomBookings.status, "BOOKED"),
                        eq(roomBookings.status, "CHECKED_IN")
                    )
                )
            );

        // Users are limited to 3 active bookings at a time
        return {
            hasReachedLimit: bookingCount[0].count >= 3,
            currentBookings: bookingCount[0].count,
        };
    } catch (error) {
        console.error("Error checking booking limit:", error);
        throw error;
    }
}
