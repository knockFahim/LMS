import { NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { libraryRooms } from "@/database/schema";
import { asc } from "drizzle-orm";

export async function GET() {
    try {
        const rooms = await db
            .select()
            .from(libraryRooms)
            .orderBy(asc(libraryRooms.roomNumber));
        return NextResponse.json(rooms);
    } catch (error) {
        console.error("Error fetching rooms:", error);
        return NextResponse.json(
            { error: "Failed to fetch rooms" },
            { status: 500 }
        );
    }
}
