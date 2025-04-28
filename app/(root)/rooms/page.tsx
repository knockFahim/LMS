"use client";

import { useState, useEffect } from "react";
import {
  getAvailableRooms,
  bookRoom,
  getUserBookings,
} from "@/lib/actions/room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";

const RoomsPage = () => {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [bookingHistory, setBookingHistory] = useState<Booking[]>([]);
  const { data: session } = useSession();

  interface Room {
    id: string;
    roomNumber: string;
    capacity: number;
    createdAt: Date | null;
    updatedAt: Date | null;
    isBooked?: boolean;
  }

  interface Booking {
    id: string;
    roomNumber: string;
    startTime: string;
    endTime: string;
    createdAt: string;
  }

  const fetchBookingHistory = async () => {
    if (!session?.user?.id) return;
    try {
      const history = await getUserBookings(session.user.id);
      setBookingHistory(
        history.map((item) => ({
          id: item.id,
          roomNumber: item.room.roomNumber,
          startTime: item.startTime.toISOString(),
          endTime: item.endTime.toISOString(),
          createdAt: new Date().toISOString(), // Adjust as needed
        }))
      );
    } catch (error) {
      console.error("Error fetching booking history:", error);
    }
  };

  useEffect(() => {
    fetchBookingHistory();
  }, [session?.user?.id]);

  const handleSearch = async () => {
    const response = await getAvailableRooms({
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    });
    setAvailableRooms(response);
  };

  const handleBookRoom = async (roomId: any) => {
    if (!session?.user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to book a room.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await bookRoom({
        roomId,
        userId: session.user.id,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      });

      if (response) {
        await fetchBookingHistory();
        toast({
          title: "Success",
          description: "Room booked successfully.",
          variant: "default",
        });
        setAvailableRooms((prevRooms) =>
          prevRooms.map((room) =>
            room.id === roomId ? { ...room, isBooked: true } : room
          )
        );
      } else {
        toast({
          title: "Error",
          description: "Failed to book the room.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.message || "An error occurred while booking the room.",
        variant: "destructive",
      });
      console.error("Error booking room:", error);
    }
  };

  return (
    <section className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Search for Rooms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="Start Time"
            />
            <Input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              placeholder="End Time"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSearch} className="w-full md:w-auto">
            Search
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Available Rooms</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room Number</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {availableRooms.length > 0 ? (
                availableRooms.map((room: any) => (
                  <TableRow key={room.id}>
                    <TableCell>{room.roomNumber}</TableCell>
                    <TableCell>{room.capacity}</TableCell>
                    <TableCell>
                      <Button
                        onClick={() => handleBookRoom(room.id)}
                        variant="outline"
                        disabled={room.isBooked}
                      >
                        {room.isBooked ? "Booked" : "Book"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    No rooms available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Booking History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room Number</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Booked On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookingHistory.length > 0 ? (
                bookingHistory.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.roomNumber}</TableCell>
                    <TableCell>
                      {new Date(booking.startTime).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(booking.endTime).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(booking.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No booking history found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
};

export default RoomsPage;
