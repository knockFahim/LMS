"use server";

import { db } from "@/database/drizzle";
import { libraryRooms, roomBookings, users } from "@/database/schema";
import { and, eq, or, sql, not, exists, gte, lte } from "drizzle-orm";

export async function addRoom({
  roomNumber,
  capacity,
}: {
  roomNumber: string;
  capacity: number;
}) {
  return db.insert(libraryRooms).values({ roomNumber, capacity }).returning();
}

export async function editRoom({
  id,
  roomNumber,
  capacity,
}: {
  id: string;
  roomNumber: string;
  capacity: number;
}) {
  return db
    .update(libraryRooms)
    .set({ roomNumber, capacity })
    .where(eq(libraryRooms.id, id))
    .returning();
}

export async function deleteRoom(id: string) {
  return db.delete(libraryRooms).where(eq(libraryRooms.id, id)).returning();
}

export async function getAvailableRooms({
  startTime,
  endTime,
}: {
  startTime: Date;
  endTime: Date;
}) {
  try {
    const rooms = await db
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
                  or(
                    and(
                      lte(roomBookings.startTime, new Date(endTime)),
                      gte(roomBookings.endTime, new Date(startTime))
                    )
                  )
                )
              )
          )
        )
      );

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
}: {
  roomId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
}) {
  const overlappingBookings = await db
    .select()
    .from(roomBookings)
    .where(
      and(
        eq(roomBookings.userId, userId),
        or(
          and(
            sql`${roomBookings.startTime} < ${endTime}`,
            sql`${roomBookings.endTime} > ${startTime}`
          )
        )
      )
    );

  if (overlappingBookings.length > 0) {
    throw new Error("You already have a booking that overlaps with this time.");
  }

  return db
    .insert(roomBookings)
    .values({ roomId, userId, startTime, endTime })
    .returning();
}

export async function getUserBookings(userId: string) {
  return db
    .select({
      id: roomBookings.id,
      userId: roomBookings.userId,
      startTime: roomBookings.startTime,
      endTime: roomBookings.endTime,
      room: {
        roomNumber: libraryRooms.roomNumber,
        capacity: libraryRooms.capacity,
      },
    })
    .from(roomBookings)
    .innerJoin(libraryRooms, eq(roomBookings.roomId, libraryRooms.id))
    .where(eq(roomBookings.userId, userId));
}
