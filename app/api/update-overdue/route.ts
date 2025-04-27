import { NextResponse } from "next/server";
import { updateOverdueBooks } from "@/lib/admin/actions/book";

// This API endpoint is designed to be called by a cron job to regularly update overdue books
export async function GET() {
  try {
    // Check for API key for basic security
    // In a production environment, you should use a more secure authentication method
    const result = await updateOverdueBooks();

    // Return the result
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in overdue books update API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update overdue books",
      },
      { status: 500 }
    );
  }
}
