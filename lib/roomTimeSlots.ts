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

    // Create new date objects using the same date but with our specific time slot hours and minutes
    // Use the year, month, day from the input date
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    const startTime = new Date(
        year,
        month,
        day,
        timeSlot.startHour,
        timeSlot.startMinute,
        0
    );
    const endTime = new Date(
        year,
        month,
        day,
        timeSlot.endHour,
        timeSlot.endMinute,
        0
    );

    console.log("Generated time slot dates:", {
        timeSlotId,
        originalDate: date.toISOString(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        localOriginalDate: date.toString(),
        localStartTime: startTime.toString(),
        localEndTime: endTime.toString(),
    });

    return { startTime, endTime };
}

// Check if a specific time matches an available time slot boundary
export function isValidTimePoint(date: Date): boolean {
    const minutes = date.getMinutes();

    // Instead of comparing exact hours, just check if the minutes value
    // matches one of our slot boundaries
    const allSlotMinutes = new Set();

    AVAILABLE_TIME_SLOTS.forEach((slot) => {
        allSlotMinutes.add(slot.startMinute);
        allSlotMinutes.add(slot.endMinute);
    });

    return allSlotMinutes.has(minutes);
}

// Check if a start time and end time match a valid booking slot
export function isValidTimeSlot(startTime: Date, endTime: Date): boolean {
    console.log("Time slot validation:", {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        localStartTime: startTime.toString(),
        localEndTime: endTime.toString(),
        timeDiff:
            (endTime.getTime() - startTime.getTime()) / 60000 + " minutes",
    });

    // Calculate the time difference in minutes
    const durationMinutes =
        (endTime.getTime() - startTime.getTime()) / (1000 * 60);

    // Check if the duration matches one of our time slots (most are 60 minutes)
    const correctDuration = AVAILABLE_TIME_SLOTS.some((slot) => {
        const slotDurationMinutes =
            slot.endHour * 60 +
            slot.endMinute -
            (slot.startHour * 60 + slot.startMinute);
        return Math.abs(durationMinutes - slotDurationMinutes) < 2; // Allow 2 minutes tolerance
    });

    if (!correctDuration) {
        return false;
    }

    // Check if the start time minutes match one of our slot patterns
    const startMinute = startTime.getMinutes();
    const validStartMinutes = [
        ...new Set(AVAILABLE_TIME_SLOTS.map((slot) => slot.startMinute)),
    ];

    // Also check that booking starts at the beginning of an hour or at one of our predefined minute marks
    // This ensures we're not just checking duration but also that bookings start at proper times
    return validStartMinutes.includes(startMinute);
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
