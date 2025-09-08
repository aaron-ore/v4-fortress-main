import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Users as UsersIcon, Mail, UserPlus, Trash2, Copy, Settings as SettingsIcon } from "lucide-react";
import { useProfile, UserProfile } from "@/context/ProfileContext";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabaseClient";
import ManageCustomRolesDialog from "@/components/ManageCustomRolesDialog";

const Users: React.FC = () => {
  const { profile, allProfiles, updateUserRole, fetchAllProfiles } = useProfile();
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isManageCustomRolesDialogOpen, setIsManageCustomRolesDialogOpen] = useState(false);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAllProfiles();
    }
  }, [profile?.role, fetchAllProfiles]);

  const handleDeleteUserClick = (user: UserProfile) => {
    setUserToDelete(user);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete || !profile?.organizationId) return;

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userToDelete.id)
      .eq("organization_id", profile.organizationId);

    if (error) {
      showError(`Failed to delete profile: ${error.message}`);
    } else {
      showSuccess(`Profile for ${userToDelete.fullName || userToDelete.email} deleted.`);
      fetchAllProfiles();
    }
    setIsConfirmDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    if (!profile?.organizationId) {
      showError("Organization ID not found for role update.");
      return;
    }
    try {
      await updateUserRole(userId, newRole, profile.organizationId);
    } catch (error: any) {
      // Error handling is already in updateUserRole in ProfileContext
    }
  };

  const handleCopyOrganizationCode = () => {
    if (profile?.organizationCode) {
      navigator.clipboard.writeText(profile.organizationCode);
      showSuccess("Organization Code copied to clipboard!");
    } else {
      showError("No Organization Code available to copy.");
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border">
          <CardTitle className="text-2xl font-bold mb-4">Access Denied</CardTitle>
          <CardContent>
            <p className="text-muted-foreground">You do not have administrative privileges to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">User Management</h1>
      <p className="text-muted-foreground">Manage user accounts and assign roles within Fortress.</p>

      <Card className="bg-card border-border rounded-lg shadow-sm p-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-primary" /> Your Organization Code
          </CardTitle>
          <CardDescription>
            Share this code with new users to allow them to join your organization during sign-up.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Input
            value={profile?.organizationCode || "Not available"}
            readOnly
            className="font-mono text-lg flex-grow"
          />
          <Button onClick={handleCopyOrganizationCode} disabled={!profile?.organizationCode}>
            <Copy className="h-4 w-4 mr-2" /> Copy
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => setIsManageCustomRolesDialogOpen(true)}>
          <SettingsIcon className="h-4 w-4 mr-2" /> Manage Custom Roles
        </Button>
      </div>

      <Card className="bg-card border-border rounded-lg shadow-sm p-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">All Users ({allProfiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {allProfiles.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-center w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allProfiles.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.fullName || "N/A"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.id === profile?.id ? (
                          <span className="font-semibold">{user.role === 'admin' ? 'Admin (Full Access)' : user.role === 'inventory_manager' ? 'Manager (Inventory & Orders)' : 'Viewer (Warehouse/Sales Associate)'}</span>
                        ) : (
                          <Select
                            value={user.role}
                            onValueChange={(newRole) => handleUpdateUserRole(user.id, newRole)}
                          >
                            <SelectTrigger className="w-[250px]">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer (Warehouse/Sales Associate)</SelectItem>
                              <SelectItem value="inventory_manager">Manager (Inventory & Orders)</SelectItem>
                              <SelectItem value="admin">Admin (Full Access)</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-center">
                        {user.id !== profile?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUserClick(user)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {userToDelete && (
        <ConfirmDialog
          isOpen={isConfirmDeleteDialogOpen}
          onClose={() => setIsConfirmDeleteDialogOpen(false)}
          onConfirm={confirmDeleteUser}
          title="Confirm User Deletion"
          description={`Are you sure you want to delete the profile for "${userToDelete.fullName || userToDelete.email}"? This will NOT delete the user from Supabase Authentication, only their profile data. Full user deletion requires Supabase dashboard or a server-side function.`}
          confirmText="Delete Profile"
          cancelText="Cancel"
        />
      )}

      <ManageCustomRolesDialog
        isOpen={isManageCustomRolesDialogOpen}
        onClose={() => setIsManageCustomRolesDialogOpen(false)}
      />
    </div>
  );
};

export default Users;