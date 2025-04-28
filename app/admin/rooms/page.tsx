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

const AdminRoomsPage = () => {
  const [rooms, setRooms] = useState<
    {
      id: string;
      roomNumber: string;
      capacity: number;
      createdAt: Date | null;
      updatedAt: Date | null;
    }[]
  >([]);
  const [newRoom, setNewRoom] = useState({ roomNumber: "", capacity: 0 });
  const [editingRoom, setEditingRoom] = useState<{
    id: string;
    roomNumber: string;
    capacity: number;
  } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    // Fetch rooms from the backend
    const fetchRooms = async () => {
      try {
        const response = await fetch("/api/rooms");
        const data = await response.json();
        setRooms(data);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      }
    };

    fetchRooms();
  }, []);

  const handleAddRoom = async () => {
    const response = await addRoom(newRoom);
    if (!Array.isArray(response)) {
      setRooms([...rooms, response]);
    } else {
      console.error(
        "Unexpected response format: expected a single room object."
      );
    }
    setNewRoom({ roomNumber: "", capacity: 0 });
  };

  const handleEditRoom = async () => {
    if (!editingRoom || !editingRoom.roomNumber || editingRoom.capacity <= 0) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const updatedRoom = await editRoom({
        id: editingRoom.id,
        roomNumber: editingRoom.roomNumber,
        capacity: editingRoom.capacity,
      });
      console.log("Updated room:", updatedRoom);

      if (updatedRoom) {
        setRooms(
          rooms.map((room) => {
            const matchingRoom = updatedRoom.find(
              (updated) => updated.id === room.id
            );
            return matchingRoom ? { ...room, ...matchingRoom } : room;
          })
        );
        setIsEditModalOpen(false);
        setEditingRoom(null);
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

  const handleDeleteRoom = async (id: any) => {
    await deleteRoom(id);
    setRooms(rooms.filter((room) => room.id !== id));
  };

  const handleEditButtonClick = (room: any) => {
    if (room) {
      setEditingRoom({
        id: room.id || "",
        roomNumber: room.roomNumber || "",
        capacity: room.capacity || 0,
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

  return (
    <section className="p-6">
      <h1 className="text-2xl font-bold">Manage Rooms</h1>
      <div className="mt-4">
        <form className="space-y-4 bg-white p-6 rounded-md shadow-md">
          <div className="flex flex-col">
            <label
              htmlFor="roomNumber"
              className="text-sm font-medium text-gray-700"
            >
              Room Number
            </label>
            <Input
              id="roomNumber"
              name="roomNumber"
              type="text"
              placeholder="Enter room number"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={newRoom.roomNumber}
              onChange={(e) =>
                setNewRoom({ ...newRoom, roomNumber: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col">
            <label
              htmlFor="capacity"
              className="text-sm font-medium text-gray-700"
            >
              Capacity
            </label>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              placeholder="Enter room capacity"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={newRoom.capacity}
              onChange={(e) =>
                setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) })
              }
            />
          </div>
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              onClick={handleAddRoom}
            >
              Add Room
            </button>
          </div>
        </form>
      </div>
      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Room Number</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rooms.map((room) => (
            <TableRow key={room.id}>
              <TableCell>{room.roomNumber}</TableCell>
              <TableCell>{room.capacity}</TableCell>
              <TableCell className="flex space-x-2">
                <Button onClick={() => handleEditButtonClick(room)}>
                  Edit
                </Button>
                <Button onClick={() => handleDeleteRoom(room.id)}>
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {isEditModalOpen && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
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
                  Room Number
                </label>
                <Input
                  id="editRoomNumber"
                  type="text"
                  value={editingRoom?.roomNumber || ""}
                  onChange={(e) =>
                    setEditingRoom((prev) =>
                      prev ? { ...prev, roomNumber: e.target.value } : null
                    )
                  }
                />
              </div>
              <div className="flex flex-col">
                <label
                  htmlFor="editCapacity"
                  className="text-sm font-medium text-gray-700"
                >
                  Capacity
                </label>
                <Input
                  id="editCapacity"
                  type="number"
                  value={editingRoom?.capacity || ""}
                  onChange={(e) =>
                    setEditingRoom((prev) =>
                      prev
                        ? { ...prev, capacity: parseInt(e.target.value) }
                        : null
                    )
                  }
                />
              </div>
              <div className="flex justify-end space-x-4">
                <Button type="button" onClick={() => setIsEditModalOpen(false)}>
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
