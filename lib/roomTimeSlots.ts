// Define the time slots available for booking rooms
// This helps enforce consistent booking times across the application

export interface TimeSlot {
    id: string; // Format: "HH:MM-HH:MM" (24-hour format)
    label: string; // Format: "HH:MM AM/PM - HH:MM AM/PM" (12-hour format for display)
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
}

// Time slots available for booking
export const AVAILABLE_TIME_SLOTS: TimeSlot[] = [
    {
        id: "09:00-10:00",
        label: "09:00 AM - 10:00 AM",
        startHour: 9,
        startMinute: 0,
        endHour: 10,
        endMinute: 0,
    },
    {
        id: "10:10-11:10",
        label: "10:10 AM - 11:10 AM",
        startHour: 10,
        startMinute: 10,
        endHour: 11,
        endMinute: 10,
    },
    {
        id: "11:20-12:20",
        label: "11:20 AM - 12:20 PM",
        startHour: 11,
        startMinute: 20,
        endHour: 12,
        endMinute: 20,
    },
    {
        id: "12:30-13:30",
        label: "12:30 PM - 01:30 PM",
        startHour: 12,
        startMinute: 30,
        endHour: 13,
        endMinute: 30,
    },
    {
        id: "13:40-14:40",
        label: "01:40 PM - 02:40 PM",
        startHour: 13,
        startMinute: 40,
        endHour: 14,
        endMinute: 40,
    },
    {
        id: "14:50-15:50",
        label: "02:50 PM - 03:50 PM",
        startHour: 14,
        startMinute: 50,
        endHour: 15,
        endMinute: 50,
    },
    {
        id: "16:00-17:00",
        label: "04:00 PM - 05:00 PM",
        startHour: 16,
        startMinute: 0,
        endHour: 17,
        endMinute: 0,
    },
    {
        id: "17:10-18:10",
        label: "05:10 PM - 06:10 PM",
        startHour: 17,
        startMinute: 10,
        endHour: 18,
        endMinute: 10,
    },
    {
        id: "18:20-19:20",
        label: "06:20 PM - 07:20 PM",
        startHour: 18,
        startMinute: 20,
        endHour: 19,
        endMinute: 20,
    },
    {
        id: "19:30-20:30",
        label: "07:30 PM - 08:30 PM",
        startHour: 19,
        startMinute: 30,
        endHour: 20,
        endMinute: 30,
    },
    {
        id: "20:40-21:40",
        label: "08:40 PM - 09:40 PM",
        startHour: 20,
        startMinute: 40,
        endHour: 21,
        endMinute: 40,
    },
];

// Helper function to get a time slot by ID
export function getTimeSlotById(id: string): TimeSlot | undefined {
    return AVAILABLE_TIME_SLOTS.find((slot) => slot.id === id);
}

// Get a Date object for a specific time slot on a specific date
export function getTimeSlotForDate(
    timeSlotId: string,
    date: Date
): { startTime: Date; endTime: Date } | null {
    const timeSlot = getTimeSlotById(timeSlotId);
    if (!timeSlot) return null;

    const startTime = new Date(date);
    startTime.setHours(timeSlot.startHour, timeSlot.startMinute, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(timeSlot.endHour, timeSlot.endMinute, 0, 0);

    return { startTime, endTime };
}

// Check if a specific time matches an available time slot boundary
export function isValidTimePoint(date: Date): boolean {
    const hours = date.getHours();
    const minutes = date.getMinutes();

    return AVAILABLE_TIME_SLOTS.some((slot) => {
        // Start time matches
        if (slot.startHour === hours && slot.startMinute === minutes) {
            return true;
        }

        // End time matches
        if (slot.endHour === hours && slot.endMinute === minutes) {
            return true;
        }

        return false;
    });
}

// Check if a start time and end time match a valid booking slot
export function isValidTimeSlot(startTime: Date, endTime: Date): boolean {
    // Check if any of our predefined slots match this time range
    return AVAILABLE_TIME_SLOTS.some((slot) => {
        const startHour = startTime.getHours();
        const startMinute = startTime.getMinutes();
        const endHour = endTime.getHours();
        const endMinute = endTime.getMinutes();

        // Check if both start and end times match a slot
        return (
            startHour === slot.startHour &&
            startMinute === slot.startMinute &&
            endHour === slot.endHour &&
            endMinute === slot.endMinute
        );
    });
}

// Get the nearest available time slot for a given date
export function getNearestTimeSlot(date: Date): TimeSlot | null {
    const now = new Date();

    // If the date is today, we need to filter out past time slots
    if (date.toDateString() === now.toDateString()) {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // Find the first available time slot that hasn't started yet
        for (const slot of AVAILABLE_TIME_SLOTS) {
            if (
                slot.startHour > currentHour ||
                (slot.startHour === currentHour &&
                    slot.startMinute > currentMinute)
            ) {
                return slot;
            }
        }

        // If all slots for today are in the past, return null
        return null;
    }

    // For future dates, return the first slot of the day
    return AVAILABLE_TIME_SLOTS[0];
}
