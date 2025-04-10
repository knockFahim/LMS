"use client";

import { toast } from "@/hooks/use-toast";
import { updateUserRole } from "@/lib/admin/actions/user";
import Menu from "@/components/admin/Menu";
import { userRoles } from "@/constants";

interface Props {
  userId: string;
  initialRole: string;
}

const RoleMenu = ({ userId, initialRole }: Props) => {
  const handleRoleChange = async (role: string) => {
    try {
      const result = await updateUserRole({
        userId,
        role,
      });

      if (result.success) {
        toast({
          title: "Role updated",
          description: `User role changed to ${role}`,
        });
      } else {
        throw new Error(result.error || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    }
  };

  return (
    <Menu
      label="Change Role"
      initialValue={initialRole.toLowerCase()}
      items={userRoles}
      userId={userId}
      onStatusChange={handleRoleChange}
    />
  );
};

export default RoleMenu;
