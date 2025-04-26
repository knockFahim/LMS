import { NextResponse } from "next/server";
import { applyLibraryMessagesTable } from "@/database/apply-library-messages";

export async function GET() {
  try {
    const result = await applyLibraryMessagesTable();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in setup-library-messages route:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
