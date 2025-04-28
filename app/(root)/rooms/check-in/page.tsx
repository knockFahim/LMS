"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getUserBookings, checkInBooking } from "@/lib/actions/room";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default function CheckInPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [booking, setBooking] = useState<any>(null);
    const [canCheckIn, setCanCheckIn] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [checkingIn, setCheckingIn] = useState(false);

    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const bookingId = searchParams.get("id");

    useEffect(() => {
        const fetchBooking = async () => {
            if (!session?.user?.id || !bookingId) {
                setError("Missing user or booking information");
                setIsLoading(false);
                return;
            }

            try {
                const userBookings = await getUserBookings(session.user.id);
                const currentBooking = userBookings.find(
                    (b: any) => b.id === bookingId
                );

                if (!currentBooking) {
                    setError("Booking not found or not authorized");
                    setIsLoading(false);
                    return;
                }

                // Set the booking
                setBooking(currentBooking);

                // Determine if the user can check in
                const now = new Date();
                const startTime = new Date(currentBooking.startTime);
                const endTime = new Date(currentBooking.endTime);

                // Can check in 15 minutes before start time and any time until end time
                const fifteenMinutesBefore = new Date(startTime);
                fifteenMinutesBefore.setMinutes(
                    fifteenMinutesBefore.getMinutes() - 15
                );

                const canCheckInNow =
                    currentBooking.status === "BOOKED" &&
                    now >= fifteenMinutesBefore &&
                    now <= endTime;

                setCanCheckIn(canCheckInNow);
                setIsLoading(false);
            } catch (error) {
                console.error("Error fetching booking:", error);
                setError("Failed to load booking information");
                setIsLoading(false);
            }
        };

        fetchBooking();
    }, [session, bookingId]);

    const handleCheckIn = async () => {
        if (!session?.user?.id || !bookingId) return;

        setCheckingIn(true);
        try {
            await checkInBooking(bookingId, session.user.id);

            toast({
                title: "Success",
                description: "You've successfully checked in to your room",
            });

            // Redirect back to rooms page after successful check-in
            setTimeout(() => {
                router.push("/rooms");
            }, 2000);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to check in",
                variant: "destructive",
            });
            setCheckingIn(false);
        }
    };

    const getRoomTypeLabel = (type: string) => {
        return type === "INDIVIDUAL_POD"
            ? "Individual Study Pod"
            : "Group Discussion Room";
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <p>Loading booking information...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-lg mx-auto p-6 mt-10">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-destructive">
                            Error
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>{error}</p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild>
                            <Link href="/rooms">Return to Room Bookings</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="max-w-lg mx-auto p-6 mt-10">
                <Card>
                    <CardHeader>
                        <CardTitle>Booking Not Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>
                            The booking you're looking for doesn't exist or you
                            don't have permission to access it.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild>
                            <Link href="/rooms">Return to Room Bookings</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto p-6 mt-10">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Room Check-In</CardTitle>
                    <CardDescription>
                        {booking.status === "CHECKED_IN"
                            ? "You are already checked in to this room"
                            : "Check in to your booked room"}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="border rounded-md p-4">
                        <div className="grid gap-2">
                            <div className="flex justify-between">
                                <span className="font-medium">Room:</span>
                                <span>{booking.room.roomNumber}</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="font-medium">Type:</span>
                                <span>
                                    {getRoomTypeLabel(booking.room.roomType)}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="font-medium">Capacity:</span>
                                <span>{booking.room.capacity} people</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="font-medium">Start Time:</span>
                                <span>
                                    {formatDate(new Date(booking.startTime))}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="font-medium">End Time:</span>
                                <span>
                                    {formatDate(new Date(booking.endTime))}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="font-medium">Status:</span>
                                <span
                                    className={
                                        booking.status === "CHECKED_IN"
                                            ? "text-green-600 font-medium"
                                            : ""
                                    }
                                >
                                    {booking.status === "CHECKED_IN"
                                        ? "Checked In"
                                        : "Booked"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {booking.status === "CHECKED_IN" ? (
                        <div className="bg-green-50 p-4 rounded-md">
                            <p className="text-green-800 text-sm">
                                You have successfully checked in to this room.
                                The room is reserved for you until{" "}
                                {formatDate(new Date(booking.endTime))}.
                            </p>
                        </div>
                    ) : canCheckIn ? (
                        <div className="bg-blue-50 p-4 rounded-md">
                            <p className="text-blue-800 text-sm">
                                You can now check in to this room. Please click
                                the button below to confirm your arrival.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-amber-50 p-4 rounded-md">
                            <p className="text-amber-800 text-sm">
                                Check-in is available starting 15 minutes before
                                your booking time. Please return closer to your
                                reservation time.
                            </p>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex justify-between">
                    <Button variant="outline" asChild>
                        <Link href="/rooms">Back to Bookings</Link>
                    </Button>

                    {booking.status !== "CHECKED_IN" && (
                        <Button
                            onClick={handleCheckIn}
                            disabled={!canCheckIn || checkingIn}
                        >
                            {checkingIn ? "Checking In..." : "Check In Now"}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
