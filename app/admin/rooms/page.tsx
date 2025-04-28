"use client";

import { useState, useEffect } from "react";
import { addRoom, editRoom, deleteRoom } from "@/lib/actions/room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const AdminRoomsPage = () => {
    const [rooms, setRooms] = useState<
        {
            id: string;
            roomNumber: string;
            capacity: number;
            roomType: string;
            description: string | null;
            createdAt: Date | null;
            updatedAt: Date | null;
        }[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fixingDb, setFixingDb] = useState(false);
    const [fixDbResult, setFixDbResult] = useState<any>(null);
    const [newRoom, setNewRoom] = useState({
        roomNumber: "",
        capacity: 0,
        roomType: "INDIVIDUAL_POD",
        description: "",
    });
    const [editingRoom, setEditingRoom] = useState<{
        id: string;
        roomNumber: string;
        capacity: number;
        roomType: string;
        description: string | null;
    } | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [availableTimeSlots, setAvailableTimeSlots] = useState([
        { id: "09:00-10:00", label: "09:00 AM - 10:00 AM" },
        { id: "10:10-11:10", label: "10:10 AM - 11:10 AM" },
        { id: "11:20-12:20", label: "11:20 AM - 12:20 PM" },
        { id: "12:30-13:30", label: "12:30 PM - 01:30 PM" },
        { id: "13:40-14:40", label: "01:40 PM - 02:40 PM" },
        { id: "14:50-15:50", label: "02:50 PM - 03:50 PM" },
        { id: "16:00-17:00", label: "04:00 PM - 05:00 PM" },
        { id: "17:10-18:10", label: "05:10 PM - 06:10 PM" },
        { id: "18:20-19:20", label: "06:20 PM - 07:20 PM" },
        { id: "19:30-20:30", label: "07:30 PM - 08:30 PM" },
        { id: "20:40-21:40", label: "08:40 PM - 09:40 PM" },
    ]);

    useEffect(() => {
        // Fetch rooms from the backend
        const fetchRooms = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch("/api/rooms");

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();

                // Ensure data is an array
                if (Array.isArray(data)) {
                    setRooms(data);
                } else {
                    console.error("API didn't return an array:", data);
                    setRooms([]);
                    setError(
                        "Failed to load rooms data. Invalid format received."
                    );
                }
            } catch (error: any) {
                console.error("Error fetching rooms:", error);
                setError(
                    error.message ||
                        "Failed to load rooms data. Please try again later."
                );
                setRooms([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRooms();
    }, []);

    // Fix database schema if needed
    const fixDatabaseSchema = async () => {
        try {
            setFixingDb(true);
            setFixDbResult(null);
            const response = await fetch("/api/fix-room-bookings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();
            setFixDbResult(data);

            if (response.ok) {
                const { changes } = data;
                let message = "Database check completed. ";

                if (
                    changes.typeAdded ||
                    changes.statusColumnAdded ||
                    changes.checkinTimeColumnAdded
                ) {
                    message += "Fixed issues: ";
                    const fixes = [];
                    if (changes.typeAdded)
                        fixes.push("created booking status type");
                    if (changes.statusColumnAdded)
                        fixes.push("added status column");
                    if (changes.checkinTimeColumnAdded)
                        fixes.push("added checkin_time column");
                    message += fixes.join(", ");
                } else {
                    message += "No issues found, database schema is correct.";
                }

                toast({
                    title: "Database Updated",
                    description: message,
                });

                // Retry fetch after fixing
                if (
                    changes.statusColumnAdded ||
                    changes.checkinTimeColumnAdded
                ) {
                    setTimeout(() => {
                        setLoading(true);
                        setError(null);
                        fetch("/api/rooms")
                            .then((res) => res.json())
                            .then((data) => {
                                if (Array.isArray(data)) {
                                    setRooms(data);
                                }
                            })
                            .catch((err) => {
                                console.error(err);
                                setError(
                                    "Failed to reload data after fixing database."
                                );
                            })
                            .finally(() => setLoading(false));
                    }, 1000);
                }
            } else {
                toast({
                    title: "Error",
                    description:
                        data.details || "Failed to fix database schema",
                    variant: "destructive",
                });
            }
        } catch (error: any) {
            console.error("Error fixing database:", error);
            toast({
                title: "Error",
                description:
                    error.message ||
                    "Failed to connect to database fix endpoint",
                variant: "destructive",
            });
        } finally {
            setFixingDb(false);
        }
    };

    const handleAddRoom = async () => {
        if (!newRoom.roomNumber || newRoom.capacity <= 0) {
            toast({
                title: "Error",
                description: "Please fill in all required fields.",
                variant: "destructive",
            });
            return;
        }

        try {
            const response = await addRoom(newRoom);
            if (response && response.length > 0) {
                setRooms([...rooms, response[0]]);
                toast({
                    title: "Success",
                    description: "Room added successfully.",
                });
                setNewRoom({
                    roomNumber: "",
                    capacity: 0,
                    roomType: "INDIVIDUAL_POD",
                    description: "",
                });
            }
        } catch (error) {
            console.error("Error adding room:", error);
            toast({
                title: "Error",
                description: "Failed to add room.",
                variant: "destructive",
            });
        }
    };

    const handleEditRoom = async () => {
        if (
            !editingRoom ||
            !editingRoom.roomNumber ||
            editingRoom.capacity <= 0
        ) {
            toast({
                title: "Error",
                description: "Please fill in all required fields.",
                variant: "destructive",
            });
            return;
        }

        try {
            const updatedRoom = await editRoom({
                id: editingRoom.id,
                roomNumber: editingRoom.roomNumber,
                capacity: editingRoom.capacity,
                roomType: editingRoom.roomType,
                description: editingRoom.description || undefined,
            });

            if (updatedRoom && updatedRoom.length > 0) {
                setRooms(
                    rooms.map((room) => {
                        const matchingRoom = updatedRoom.find(
                            (updated) => updated.id === room.id
                        );
                        return matchingRoom
                            ? { ...room, ...matchingRoom }
                            : room;
                    })
                );
                setIsEditModalOpen(false);
                setEditingRoom(null);
                toast({
                    title: "Success",
                    description: "Room updated successfully.",
                });
            } else {
                toast({
                    title: "Error",
                    description: "Failed to update room.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error editing room:", error);
            toast({
                title: "Error",
                description: "Failed to update room.",
                variant: "destructive",
            });
        }
    };

    const handleDeleteRoom = async (id: string) => {
        try {
            await deleteRoom(id);
            setRooms(rooms.filter((room) => room.id !== id));
            toast({
                title: "Success",
                description: "Room deleted successfully.",
            });
        } catch (error) {
            console.error("Error deleting room:", error);
            toast({
                title: "Error",
                description: "Failed to delete room.",
                variant: "destructive",
            });
        }
    };

    const handleEditButtonClick = (room: any) => {
        if (room) {
            setEditingRoom({
                id: room.id || "",
                roomNumber: room.roomNumber || "",
                capacity: room.capacity || 0,
                roomType: room.roomType || "INDIVIDUAL_POD",
                description: room.description || "",
            });
            setIsEditModalOpen(true);
        } else {
            toast({
                title: "Error",
                description: "Room not found.",
                variant: "destructive",
            });
        }
    };

    const renderRoomTypeLabel = (type: string) => {
        switch (type) {
            case "INDIVIDUAL_POD":
                return "Individual Study Pod";
            case "GROUP_ROOM":
                return "Group Discussion Room";
            default:
                return type;
        }
    };

    // Helper function to determine if there's a database schema error
    const hasDbSchemaError = () => {
        if (!error) return false;
        return (
            error.includes("column room_bookings.status does not exist") ||
            error.includes("column room_bookings.checkin_time does not exist")
        );
    };

    return (
        <section className="p-6">
            <h1 className="text-2xl font-bold">Manage Rooms</h1>

            <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">
                    Available Time Slots
                </h2>
                <p className="mb-4 text-gray-600">
                    The following time slots are available for room bookings:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {availableTimeSlots.map((slot) => (
                        <div
                            key={slot.id}
                            className="p-2 bg-blue-50 rounded border border-blue-100"
                        >
                            <span className="font-medium">{slot.label}</span>
                        </div>
                    ))}
                </div>

                <p className="mt-4 text-sm text-gray-500">
                    These are the only time slots available for booking. Users
                    cannot book rooms at arbitrary times.
                </p>
            </div>

            {hasDbSchemaError() && (
                <Alert className="mt-4 bg-amber-50 border border-amber-300">
                    <AlertTitle className="text-amber-800">
                        Database Schema Issue Detected
                    </AlertTitle>
                    <AlertDescription className="text-amber-700">
                        <p className="mt-1">
                            Your database is missing required columns in the
                            room_bookings table.
                        </p>
                        <p className="mt-1 text-sm">{error}</p>
                        <Button
                            onClick={fixDatabaseSchema}
                            disabled={fixingDb}
                            className="mt-2 bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {fixingDb
                                ? "Fixing Database..."
                                : "Fix Database Schema"}
                        </Button>

                        {fixDbResult && (
                            <div className="mt-2 text-sm">
                                <p>
                                    <strong>Fix Results:</strong>
                                </p>
                                <pre className="p-2 bg-white/50 rounded mt-1 overflow-auto max-h-40">
                                    {JSON.stringify(fixDbResult, null, 2)}
                                </pre>
                            </div>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            <div className="mt-4">
                <form className="space-y-4 bg-white p-6 rounded-md shadow-md">
                    <div className="flex flex-col">
                        <label
                            htmlFor="roomNumber"
                            className="text-sm font-medium text-gray-700"
                        >
                            Room Number *
                        </label>
                        <Input
                            id="roomNumber"
                            name="roomNumber"
                            type="text"
                            placeholder="Enter room number"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            value={newRoom.roomNumber}
                            onChange={(e) =>
                                setNewRoom({
                                    ...newRoom,
                                    roomNumber: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div className="flex flex-col">
                        <label
                            htmlFor="capacity"
                            className="text-sm font-medium text-gray-700"
                        >
                            Capacity *
                        </label>
                        <Input
                            id="capacity"
                            name="capacity"
                            type="number"
                            placeholder="Enter room capacity"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            value={newRoom.capacity}
                            onChange={(e) =>
                                setNewRoom({
                                    ...newRoom,
                                    capacity: parseInt(e.target.value) || 0,
                                })
                            }
                        />
                    </div>

                    <div className="flex flex-col">
                        <label
                            htmlFor="roomType"
                            className="text-sm font-medium text-gray-700"
                        >
                            Room Type *
                        </label>
                        <Select
                            value={newRoom.roomType}
                            onValueChange={(value) =>
                                setNewRoom({ ...newRoom, roomType: value })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select room type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="INDIVIDUAL_POD">
                                    Individual Study Pod
                                </SelectItem>
                                <SelectItem value="GROUP_ROOM">
                                    Group Discussion Room
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col">
                        <label
                            htmlFor="description"
                            className="text-sm font-medium text-gray-700"
                        >
                            Description
                        </label>
                        <Textarea
                            id="description"
                            placeholder="Enter room description"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            value={newRoom.description}
                            onChange={(e) =>
                                setNewRoom({
                                    ...newRoom,
                                    description: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div className="flex justify-end space-x-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                setNewRoom({
                                    roomNumber: "",
                                    capacity: 0,
                                    roomType: "INDIVIDUAL_POD",
                                    description: "",
                                })
                            }
                        >
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleAddRoom}>
                            Add Room
                        </Button>
                    </div>
                </form>
            </div>

            {loading ? (
                <div className="mt-6 text-center p-8">
                    <p>Loading rooms data...</p>
                </div>
            ) : error ? (
                <div className="mt-6 text-center p-4 bg-red-50 text-red-600 rounded-md">
                    <p>{error}</p>
                    <div className="flex space-x-4 justify-center mt-4">
                        <Button
                            className="mt-2"
                            onClick={() => {
                                setLoading(true);
                                setError(null);
                                // Refetch the rooms data
                                fetch("/api/rooms")
                                    .then((res) => res.json())
                                    .then((data) => {
                                        if (Array.isArray(data)) {
                                            setRooms(data);
                                        } else {
                                            setRooms([]);
                                            setError(
                                                "Failed to load rooms data. Invalid format received."
                                            );
                                        }
                                    })
                                    .catch((err) => {
                                        console.error(err);
                                        setError(
                                            "Failed to load rooms data. Please try again later."
                                        );
                                    })
                                    .finally(() => setLoading(false));
                            }}
                        >
                            Try Again
                        </Button>
                        <Button
                            variant="outline"
                            onClick={fixDatabaseSchema}
                            disabled={fixingDb}
                        >
                            {fixingDb
                                ? "Fixing Database..."
                                : "Fix Database Schema"}
                        </Button>
                    </div>
                </div>
            ) : (
                <Table className="mt-6">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Room Number</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Capacity</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rooms.length > 0 ? (
                            rooms.map((room) => (
                                <TableRow key={room.id}>
                                    <TableCell>{room.roomNumber}</TableCell>
                                    <TableCell>
                                        {renderRoomTypeLabel(
                                            room.roomType || "INDIVIDUAL_POD"
                                        )}
                                    </TableCell>
                                    <TableCell>{room.capacity}</TableCell>
                                    <TableCell className="max-w-[200px] truncate">
                                        {room.description || "—"}
                                    </TableCell>
                                    <TableCell className="flex space-x-2">
                                        <Button
                                            onClick={() =>
                                                handleEditButtonClick(room)
                                            }
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() =>
                                                handleDeleteRoom(room.id)
                                            }
                                        >
                                            Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="text-center py-8"
                                >
                                    No rooms found. Add a new room to get
                                    started.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            )}

            {isEditModalOpen && (
                <Dialog
                    open={isEditModalOpen}
                    onOpenChange={setIsEditModalOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Room</DialogTitle>
                        </DialogHeader>
                        <form className="space-y-4">
                            <div className="flex flex-col">
                                <label
                                    htmlFor="editRoomNumber"
                                    className="text-sm font-medium text-gray-700"
                                >
                                    Room Number *
                                </label>
                                <Input
                                    id="editRoomNumber"
                                    type="text"
                                    value={editingRoom?.roomNumber || ""}
                                    onChange={(e) =>
                                        setEditingRoom((prev) =>
                                            prev
                                                ? {
                                                      ...prev,
                                                      roomNumber:
                                                          e.target.value,
                                                  }
                                                : null
                                        )
                                    }
                                />
                            </div>

                            <div className="flex flex-col">
                                <label
                                    htmlFor="editCapacity"
                                    className="text-sm font-medium text-gray-700"
                                >
                                    Capacity *
                                </label>
                                <Input
                                    id="editCapacity"
                                    type="number"
                                    value={editingRoom?.capacity || ""}
                                    onChange={(e) =>
                                        setEditingRoom((prev) =>
                                            prev
                                                ? {
                                                      ...prev,
                                                      capacity:
                                                          parseInt(
                                                              e.target.value
                                                          ) || 0,
                                                  }
                                                : null
                                        )
                                    }
                                />
                            </div>

                            <div className="flex flex-col">
                                <label
                                    htmlFor="editRoomType"
                                    className="text-sm font-medium text-gray-700"
                                >
                                    Room Type *
                                </label>
                                <Select
                                    value={
                                        editingRoom?.roomType ||
                                        "INDIVIDUAL_POD"
                                    }
                                    onValueChange={(value) =>
                                        setEditingRoom((prev) =>
                                            prev
                                                ? { ...prev, roomType: value }
                                                : null
                                        )
                                    }
                                >
                                    <SelectTrigger id="editRoomType">
                                        <SelectValue placeholder="Select room type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INDIVIDUAL_POD">
                                            Individual Study Pod
                                        </SelectItem>
                                        <SelectItem value="GROUP_ROOM">
                                            Group Discussion Room
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col">
                                <label
                                    htmlFor="editDescription"
                                    className="text-sm font-medium text-gray-700"
                                >
                                    Description
                                </label>
                                <Textarea
                                    id="editDescription"
                                    placeholder="Enter room description"
                                    value={editingRoom?.description || ""}
                                    onChange={(e) =>
                                        setEditingRoom((prev) =>
                                            prev
                                                ? {
                                                      ...prev,
                                                      description:
                                                          e.target.value,
                                                  }
                                                : null
                                        )
                                    }
                                />
                            </div>

                            <div className="flex justify-end space-x-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsEditModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="button" onClick={handleEditRoom}>
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
        </section>
    );
};

export default AdminRoomsPage;
