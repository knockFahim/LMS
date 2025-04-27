import { sql } from "drizzle-orm";
import { db } from "./drizzle";

// Script to add OVERDUE value to the borrow_status enum
async function updateBorrowStatusEnum() {
  console.log("Adding OVERDUE to borrow_status enum...");

  try {
    // Check if OVERDUE already exists in the enum
    const enumValues = await db.execute(sql`
      SELECT enum_range(NULL::borrow_status);
    `);

    console.log("Current enum values:", enumValues[0].enum_range);

    // If OVERDUE is not in the enum, add it
    if (!enumValues[0].enum_range.includes("OVERDUE")) {
      await db.execute(sql`
        ALTER TYPE borrow_status ADD VALUE 'OVERDUE';
      `);
      console.log("Successfully added OVERDUE to borrow_status enum");
    } else {
      console.log("OVERDUE value already exists in borrow_status enum");
    }

    // Verify the enum now contains OVERDUE
    const updatedEnumValues = await db.execute(sql`
      SELECT enum_range(NULL::borrow_status);
    `);

    console.log("Updated enum values:", updatedEnumValues[0].enum_range);
  } catch (error) {
    console.error("Error updating enum:", error);
  }
}

// Run the function
updateBorrowStatusEnum()
  .then(() => {
    console.log("Finished enum update process");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
