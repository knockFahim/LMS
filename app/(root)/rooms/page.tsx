"use client";

import { useState, useEffect } from "react";
import {
    getAvailableRooms,
    bookRoom,
    getUserBookings,
    cancelBooking,
    checkInBooking,
    hasUserReachedBookingLimit,
} from "@/lib/actions/room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
    CardDescription,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

const RoomsPage = () => {
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [roomType, setRoomType] = useState<"INDIVIDUAL_POD" | "GROUP_ROOM">(
        "INDIVIDUAL_POD"
    );
    const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
    const [bookingHistory, setBookingHistory] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [bookingNotes, setBookingNotes] = useState("");
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [bookingLimitInfo, setBookingLimitInfo] = useState({
        hasReachedLimit: false,
        currentBookings: 0,
    });
    const { data: session } = useSession();

    interface Room {
        id: string;
        roomNumber: string;
        capacity: number;
        roomType: string;
        description: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        isBooked?: boolean;
    }

    interface Booking {
        id: string;
        startTime: string;
        endTime: string;
        status: string;
        checkinTime: string | null;
        notes: string | null;
        createdAt: string;
        room: {
            id: string;
            roomNumber: string;
            capacity: number;
            roomType: string;
            description: string | null;
        };
    }

    // Initialize with today's date and time
    useEffect(() => {
        const now = new Date();
        now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15); // Round up to nearest 15 minutes

        const start = new Date(now);
        start.setHours(start.getHours() + 1); // Default start time is 1 hour from now

        const end = new Date(start);
        end.setHours(end.getHours() + 2); // Default duration is 2 hours

        setStartTime(start.toISOString().slice(0, 16));
        setEndTime(end.toISOString().slice(0, 16));
    }, []);

    const fetchBookingHistory = async () => {
        if (!session?.user?.id) return;
        try {
            setIsLoading(true);
            const history = await getUserBookings(session.user.id);
            setBookingHistory(history);
            setIsLoading(false);

            // Also check booking limit
            const limitInfo = await hasUserReachedBookingLimit(session.user.id);
            setBookingLimitInfo(limitInfo);
        } catch (error) {
            console.error("Error fetching booking history:", error);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session?.user?.id) {
            fetchBookingHistory();
        }
    }, [session?.user?.id]);

    const handleSearch = async () => {
        if (!startTime || !endTime) {
            toast({
                title: "Error",
                description: "Please select both start and end times",
                variant: "destructive",
            });
            return;
        }

        if (new Date(startTime) >= new Date(endTime)) {
            toast({
                title: "Error",
                description: "End time must be after start time",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsLoading(true);
            const response = await getAvailableRooms({
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                roomType,
            });
            setAvailableRooms(response);
            setIsLoading(false);
        } catch (error: any) {
            setIsLoading(false);
            toast({
                title: "Error",
                description: error.message || "Failed to get available rooms",
                variant: "destructive",
            });
        }
    };

    const handleOpenBookDialog = (roomId: string) => {
        setSelectedRoomId(roomId);
        setIsConfirmDialogOpen(true);
    };

    const handleConfirmBooking = async () => {
        if (!selectedRoomId || !session?.user?.id) {
            toast({
                title: "Error",
                description: "Missing booking information",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsLoading(true);
            await bookRoom({
                roomId: selectedRoomId,
                userId: session.user.id,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                notes: bookingNotes || undefined,
            });

            toast({
                title: "Success",
                description: "Room booked successfully",
            });

            // Reset the form and close dialog
            setBookingNotes("");
            setIsConfirmDialogOpen(false);
            setSelectedRoomId(null);

            // Refresh booking history and available rooms
            await fetchBookingHistory();
            await handleSearch();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to book room",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelBooking = async (bookingId: string) => {
        if (!session?.user?.id) return;

        try {
            setIsLoading(true);
            await cancelBooking(bookingId, session.user.id);

            toast({
                title: "Success",
                description: "Booking cancelled successfully",
            });

            // Refresh booking history
            await fetchBookingHistory();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to cancel booking",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckIn = async (bookingId: string) => {
        if (!session?.user?.id) return;

        try {
            setIsLoading(true);
            await checkInBooking(bookingId, session.user.id);

            toast({
                title: "Success",
                description: "Checked in successfully",
            });

            // Refresh booking history
            await fetchBookingHistory();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to check in",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "BOOKED":
                return <Badge variant="outline">Booked</Badge>;
            case "CHECKED_IN":
                return <Badge variant="default">Checked In</Badge>;
            case "COMPLETED":
                return <Badge variant="secondary">Completed</Badge>;
            case "CANCELLED":
                return <Badge variant="destructive">Cancelled</Badge>;
            case "NO_SHOW":
                return <Badge variant="destructive">No Show</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const isBookingInFuture = (startTimeStr: string) => {
        const startTime = new Date(startTimeStr);
        return startTime > new Date();
    };

    const canCheckIn = (booking: Booking) => {
        if (booking.status !== "BOOKED") return false;

        const now = new Date();
        const startTime = new Date(booking.startTime);
        const fifteenMinutesBefore = new Date(startTime);
        fifteenMinutesBefore.setMinutes(fifteenMinutesBefore.getMinutes() - 15);

        return now >= fifteenMinutesBefore && now <= new Date(booking.endTime);
    };

    const getRoomTypeLabel = (type: string) => {
        return type === "INDIVIDUAL_POD"
            ? "Individual Study Pod"
            : "Group Discussion Room";
    };

    return (
        <section className="p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">
                        Library Room Bookings
                    </CardTitle>
                    <CardDescription>
                        Reserve individual study pods or group discussion rooms.
                        Bookings can be made up to 7 days in advance.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <Tabs defaultValue="individual" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger
                                value="individual"
                                onClick={() => setRoomType("INDIVIDUAL_POD")}
                            >
                                Individual Study Pods
                            </TabsTrigger>
                            <TabsTrigger
                                value="group"
                                onClick={() => setRoomType("GROUP_ROOM")}
                            >
                                Group Discussion Rooms
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="individual" className="pt-4">
                            <CardDescription>
                                Individual study pods are small, private areas
                                that help students and faculty focus on their
                                work without disturbances, providing a
                                comfortable place to study on their own.
                            </CardDescription>
                        </TabsContent>

                        <TabsContent value="group" className="pt-4">
                            <CardDescription>
                                Library group discussion rooms are available
                                only for BRAC University faculty and students to
                                meet and collaborate on their projects.
                            </CardDescription>
                        </TabsContent>
                    </Tabs>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className="text-sm font-medium block mb-1">
                                Start Time
                            </label>
                            <Input
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium block mb-1">
                                End Time
                            </label>
                            <Input
                                type="datetime-local"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full"
                            />
                        </div>
                    </div>
                </CardContent>

                <CardFooter>
                    <Button
                        onClick={handleSearch}
                        className="w-full"
                        disabled={isLoading}
                    >
                        {isLoading ? "Searching..." : "Search Available Rooms"}
                    </Button>
                </CardFooter>
            </Card>

            {bookingLimitInfo.hasReachedLimit && (
                <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle className="text-destructive">
                            Booking Limit Reached
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>
                            You have reached your limit of 3 active bookings.
                            Please complete or cancel existing bookings before
                            making new ones.
                        </p>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl font-bold">
                        Available Rooms
                    </CardTitle>
                    <CardDescription>
                        Found {availableRooms.length} available{" "}
                        {roomType === "INDIVIDUAL_POD"
                            ? "individual study pods"
                            : "group discussion rooms"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {availableRooms.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {availableRooms.map((room) => (
                                <Card key={room.id} className="overflow-hidden">
                                    <CardHeader className="bg-primary/5">
                                        <CardTitle>{room.roomNumber}</CardTitle>
                                        <CardDescription>
                                            {getRoomTypeLabel(room.roomType)} •
                                            Capacity: {room.capacity}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <p className="text-sm">
                                            {room.description ||
                                                "No description available"}
                                        </p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button
                                            onClick={() =>
                                                handleOpenBookDialog(room.id)
                                            }
                                            disabled={
                                                bookingLimitInfo.hasReachedLimit ||
                                                isLoading
                                            }
                                            className="w-full"
                                        >
                                            Book Now
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">
                                No rooms available for the selected time and
                                type
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Try another time or room type
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl font-bold">
                        My Bookings
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="upcoming">
                        <TabsList>
                            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                            <TabsTrigger value="past">Past</TabsTrigger>
                            <TabsTrigger value="cancelled">
                                Cancelled
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="upcoming" className="pt-4">
                            {bookingHistory.filter(
                                (b) =>
                                    (b.status === "BOOKED" ||
                                        b.status === "CHECKED_IN") &&
                                    new Date(b.endTime) > new Date()
                            ).length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Room</TableHead>
                                            <TableHead>Time</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bookingHistory
                                            .filter(
                                                (booking) =>
                                                    (booking.status ===
                                                        "BOOKED" ||
                                                        booking.status ===
                                                            "CHECKED_IN") &&
                                                    new Date(booking.endTime) >
                                                        new Date()
                                            )
                                            .sort(
                                                (a, b) =>
                                                    new Date(
                                                        a.startTime
                                                    ).getTime() -
                                                    new Date(
                                                        b.startTime
                                                    ).getTime()
                                            )
                                            .map((booking) => (
                                                <TableRow key={booking.id}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium">
                                                                {
                                                                    booking.room
                                                                        .roomNumber
                                                                }
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {getRoomTypeLabel(
                                                                    booking.room
                                                                        .roomType
                                                                )}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <p className="whitespace-nowrap">
                                                                {formatDate(
                                                                    new Date(
                                                                        booking.startTime
                                                                    )
                                                                )}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                                                                to{" "}
                                                                {formatDate(
                                                                    new Date(
                                                                        booking.endTime
                                                                    )
                                                                )}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatusBadge(
                                                            booking.status
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            {canCheckIn(
                                                                booking
                                                            ) && (
                                                                <Button
                                                                    variant="default"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        handleCheckIn(
                                                                            booking.id
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        isLoading
                                                                    }
                                                                >
                                                                    Check In
                                                                </Button>
                                                            )}
                                                            {booking.status ===
                                                                "BOOKED" &&
                                                                isBookingInFuture(
                                                                    booking.startTime
                                                                ) && (
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        onClick={() =>
                                                                            handleCancelBooking(
                                                                                booking.id
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            isLoading
                                                                        }
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">
                                        No upcoming bookings
                                    </p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="past" className="pt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Room</TableHead>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bookingHistory
                                        .filter(
                                            (booking) =>
                                                (booking.status ===
                                                    "CHECKED_IN" ||
                                                    booking.status ===
                                                        "COMPLETED") &&
                                                new Date(booking.endTime) <=
                                                    new Date()
                                        )
                                        .sort(
                                            (a, b) =>
                                                new Date(
                                                    b.startTime
                                                ).getTime() -
                                                new Date(a.startTime).getTime()
                                        )
                                        .map((booking) => (
                                            <TableRow key={booking.id}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">
                                                            {
                                                                booking.room
                                                                    .roomNumber
                                                            }
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {getRoomTypeLabel(
                                                                booking.room
                                                                    .roomType
                                                            )}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p>
                                                            {formatDate(
                                                                new Date(
                                                                    booking.startTime
                                                                )
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            to{" "}
                                                            {formatDate(
                                                                new Date(
                                                                    booking.endTime
                                                                )
                                                            )}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(
                                                        booking.status
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    {bookingHistory.filter(
                                        (b) =>
                                            (b.status === "CHECKED_IN" ||
                                                b.status === "COMPLETED") &&
                                            new Date(b.endTime) <= new Date()
                                    ).length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={3}
                                                className="text-center py-8"
                                            >
                                                <p className="text-muted-foreground">
                                                    No past bookings
                                                </p>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TabsContent>

                        <TabsContent value="cancelled" className="pt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Room</TableHead>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bookingHistory
                                        .filter(
                                            (booking) =>
                                                booking.status ===
                                                    "CANCELLED" ||
                                                booking.status === "NO_SHOW"
                                        )
                                        .sort(
                                            (a, b) =>
                                                new Date(
                                                    b.startTime
                                                ).getTime() -
                                                new Date(a.startTime).getTime()
                                        )
                                        .map((booking) => (
                                            <TableRow key={booking.id}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">
                                                            {
                                                                booking.room
                                                                    .roomNumber
                                                            }
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {getRoomTypeLabel(
                                                                booking.room
                                                                    .roomType
                                                            )}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p>
                                                            {formatDate(
                                                                new Date(
                                                                    booking.startTime
                                                                )
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            to{" "}
                                                            {formatDate(
                                                                new Date(
                                                                    booking.endTime
                                                                )
                                                            )}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(
                                                        booking.status
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    {bookingHistory.filter(
                                        (b) =>
                                            b.status === "CANCELLED" ||
                                            b.status === "NO_SHOW"
                                    ).length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={3}
                                                className="text-center py-8"
                                            >
                                                <p className="text-muted-foreground">
                                                    No cancelled bookings
                                                </p>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl font-bold">
                        Important Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-semibold">Booking Rules</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>
                                Reservations can be made up to 7 days in advance
                            </li>
                            <li>
                                You can have a maximum of 3 active bookings at
                                any time
                            </li>
                            <li>
                                You must check in within 15 minutes of your
                                booking start time
                            </li>
                            <li>
                                Failure to check in will be marked as a
                                "no-show"
                            </li>
                            <li>
                                Multiple no-shows may result in temporary loss
                                of booking privileges
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold">Self Check-in Process</h3>
                        <p className="mt-1">
                            To check in, visit the "My Bookings" tab and click
                            the "Check In" button when you arrive at your booked
                            room.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold">Need Help?</h3>
                        <p className="mt-1">
                            For assistance with room bookings, please{" "}
                            <Link
                                href="/ask-librarian"
                                className="text-primary underline"
                            >
                                contact the library
                            </Link>
                            .
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Booking Confirmation Dialog */}
            <Dialog
                open={isConfirmDialogOpen}
                onOpenChange={setIsConfirmDialogOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Room Booking</DialogTitle>
                        <DialogDescription>
                            Please review your booking details before
                            confirming.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-sm">Room:</h4>
                            <p>
                                {
                                    availableRooms.find(
                                        (r) => r.id === selectedRoomId
                                    )?.roomNumber
                                }
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-sm">Type:</h4>
                            <p>{getRoomTypeLabel(roomType)}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-semibold text-sm">
                                    Start Time:
                                </h4>
                                <p>{formatDate(new Date(startTime))}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm">
                                    End Time:
                                </h4>
                                <p>{formatDate(new Date(endTime))}</p>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold text-sm">
                                Booking Notes (Optional):
                            </h4>
                            <Textarea
                                placeholder="Add any special requirements or notes here..."
                                value={bookingNotes}
                                onChange={(e) =>
                                    setBookingNotes(e.target.value)
                                }
                                className="mt-2"
                            />
                        </div>

                        <div className="bg-amber-50 p-3 rounded">
                            <p className="text-sm text-amber-800">
                                Please note: You must check in within 15 minutes
                                of your booking start time. Failure to do so
                                will result in a no-show record and the room
                                will become available to others.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsConfirmDialogOpen(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmBooking}
                            disabled={isLoading}
                        >
                            {isLoading ? "Booking..." : "Confirm Booking"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
};

export default RoomsPage;
