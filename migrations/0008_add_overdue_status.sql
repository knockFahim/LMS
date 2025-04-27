-- Add OVERDUE value to the borrow_status enum type
ALTER TYPE borrow_status ADD VALUE IF NOT EXISTS 'OVERDUE';