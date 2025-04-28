import { NextResponse } from "next/server";
import {
  checkOverdueAndCreateFines,
  checkForLostBooks,
} from "@/lib/actions/fines";

// This API endpoint is designed to be called by a cron job to process fines
export async function GET() {
  try {
    // First, update overdue books and create fines
    const overdueResult = await checkOverdueAndCreateFines();

    // Then, check for lost books (6+ weeks overdue)
    const lostResult = await checkForLostBooks();

    // Return combined results
    return NextResponse.json({
      success: true,
      overdue: overdueResult,
      lost: lostResult,
    });
  } catch (error) {
    console.error("Error in fines update API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process fines",
      },
      { status: 500 }
    );
  }
}
