"use client";

import { useState } from "react";
import { toast } from "@/hooks/use-toast";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface MenuItem {
  value: string;
  label: string;
  bgColor: string;
  textColor: string;
}

interface Props {
  label: string;
  initialValue: string;
  items: MenuItem[];
  borrowId?: string;
  userId?: string;
  onStatusChange?: (value: string, id?: string) => Promise<void>;
}

const Menu = ({
  label,
  initialValue,
  items,
  borrowId,
  userId,
  onStatusChange,
}: Props) => {
  const [activeItem, setActiveItem] = useState(initialValue);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleItemClick = async (value: string) => {
    if (value === activeItem) return;

    if (onStatusChange) {
      try {
        setIsUpdating(true);
        // If borrowId is provided, use that, otherwise use userId
        const id = borrowId || userId;
        await onStatusChange(value, id);
        setActiveItem(value);
      } catch (error) {
        console.error("Error updating:", error);
        toast({
          title: "Error",
          description: "Failed to update",
          variant: "destructive",
        });
      } finally {
        setIsUpdating(false);
      }
    } else {
      setActiveItem(value);
      console.log(`Clicked: ${value}`);
    }
  };

  const getItemStyle = (item: MenuItem) => {
    return cn(
      "capitalize w-fit text-center text-sm font-medium px-5 py-1 rounded-full",
      item.bgColor,
      item.textColor
    );
  };

  const activeMenuItem =
    items.find((item) => item.value === activeItem) || items[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          getItemStyle(activeMenuItem),
          "outline-none ring-0 focus:ring-0",
          isUpdating && "opacity-50 cursor-not-allowed"
        )}
        disabled={isUpdating}
      >
        {isUpdating ? "Updating..." : activeMenuItem.label}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-36">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator className="mb-2" />
        {items.map((item) => (
          <DropdownMenuItem
            key={item.value}
            disabled={isUpdating}
            onClick={() => handleItemClick(item.value)}
          >
            <p className={cn(getItemStyle(item))}>{item.label}</p>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default Menu;
