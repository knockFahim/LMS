import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
    return name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export function formatDate(
    date: Date | string | number | null | undefined
): string {
    if (!date) return "N/A";

    try {
        const dateObject = new Date(date);

        // Check if date is valid
        if (isNaN(dateObject.getTime())) {
            return "Invalid Date";
        }

        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
            hour12: true,
        }).format(dateObject);
    } catch (error) {
        console.error("Error formatting date:", error);
        return "Invalid Date";
    }
}
