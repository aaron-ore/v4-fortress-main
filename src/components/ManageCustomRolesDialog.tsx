import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Edit, Trash2, Settings, Copy } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import ConfirmDialog from "@/components/ConfirmDialog";

// Mock data for features and roles (not persisted)
const availableFeatures = [
  "View Dashboard",
  "Manage Inventory",
  "Create/Edit Orders",
  "View Reports",
  "Manage Vendors",
  "Manage Users",
  "Access Warehouse Operations",
  "Generate Labels",
  "Adjust Stock",
  "Import/Export Data",
  "Manage Categories",
  "Manage Locations",
  "Access Billing",
  "Change Account Settings",
];

interface CustomRole {
  id: string;
  name: string;
  description: string;
  features: string[]; // Array of feature names
}

const initialMockRoles: CustomRole[] = [
  {
    id: "role-1",
    name: "Warehouse Manager",
    description: "Manages daily warehouse operations and inventory.",
    features: [
      "View Dashboard",
      "Manage Inventory",
      "Create/Edit Orders",
      "Access Warehouse Operations",
      "Generate Labels",
      "Adjust Stock",
      "Import/Export Data",
      "Manage Categories",
      "Manage Locations",
    ],
  },
  {
    id: "role-2",
    name: "Sales Associate",
    description: "Handles sales orders and customer interactions.",
    features: [
      "View Dashboard",
      "Create/Edit Orders",
      "View Reports",
      "Manage Vendors",
    ],
  },
];

interface ManageCustomRolesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManageCustomRolesDialog: React.FC<ManageCustomRolesDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const [roles, setRoles] = useState<CustomRole[]>(initialMockRoles);
  const [isAddEditRoleDialogOpen, setIsAddEditRoleDialogOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<CustomRole | null>(null);

  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<CustomRole | null>(null);

  useEffect(() => {
    if (!isAddEditRoleDialogOpen) {
      // Reset form when add/edit dialog closes
      setNewRoleName("");
      setNewRoleDescription("");
      setSelectedFeatures(new Set());
      setRoleToEdit(null);
    } else if (roleToEdit) {
      // Populate form if editing
      setNewRoleName(roleToEdit.name);
      setNewRoleDescription(roleToEdit.description);
      setSelectedFeatures(new Set(roleToEdit.features));
    }
  }, [isAddEditRoleDialogOpen, roleToEdit]);

  const handleFeatureToggle = (feature: string, checked: boolean) => {
    setSelectedFeatures(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(feature);
      } else {
        newSet.delete(feature);
      }
      return newSet;
    });
  };

  const handleSaveRole = () => {
    if (!newRoleName.trim()) {
      showError("Role name cannot be empty.");
      return;
    }

    if (roleToEdit) {
      // Edit existing role
      setRoles(prev => prev.map(role =>
        role.id === roleToEdit.id
          ? { ...role, name: newRoleName.trim(), description: newRoleDescription.trim(), features: Array.from(selectedFeatures) }
          : role
      ));
      showSuccess(`Role "${newRoleName.trim()}" updated.`);
    } else {
      // Add new role
      const newId = `role-${Date.now()}`;
      setRoles(prev => [
        ...prev,
        {
          id: newId,
          name: newRoleName.trim(),
          description: newRoleDescription.trim(),
          features: Array.from(selectedFeatures),
        },
      ]);
      showSuccess(`Role "${newRoleName.trim()}" created.`);
    }
    setIsAddEditRoleDialogOpen(false);
  };

  const handleEditRoleClick = (role: CustomRole) => {
    setRoleToEdit(role);
    setIsAddEditRoleDialogOpen(true);
  };

  const handleDeleteRoleClick = (role: CustomRole) => {
    setRoleToDelete(role);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteRole = () => {
    if (roleToDelete) {
      setRoles(prev => prev.filter(role => role.id !== roleToDelete.id));
      showSuccess(`Role "${roleToDelete.name}" deleted.`);
    }
    setIsConfirmDeleteDialogOpen(false);
    setRoleToDelete(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" /> Manage Custom Roles
            </DialogTitle>
            <DialogDescription>
              Create, edit, or delete custom roles and define their permissions.
              <p className="text-red-500 font-semibold mt-2">
                Note: This is a UI demonstration. Custom roles are not persisted to the database and are not assigned to users in this demo.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button onClick={() => setIsAddEditRoleDialogOpen(true)} className="w-full">
              <PlusCircle className="h-4 w-4 mr-2" /> Create New Role
            </Button>

            {roles.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No custom roles defined yet.</p>
            ) : (
              <ScrollArea className="h-60 border border-border rounded-md p-3 bg-muted/20">
                <div className="space-y-3">
                  {roles.map(role => (
                    <div key={role.id} className="flex items-center justify-between p-2 bg-card rounded-md shadow-sm">
                      <div>
                        <h4 className="font-semibold text-foreground">{role.name}</h4>
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditRoleClick(role)}>
                          <Edit className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRoleClick(role)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Role Dialog */}
      <Dialog open={isAddEditRoleDialogOpen} onOpenChange={setIsAddEditRoleDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{roleToEdit ? "Edit Custom Role" : "Create New Custom Role"}</DialogTitle>
            <DialogDescription>
              {roleToEdit ? "Update the details and permissions for this role." : "Define a new role and assign its permissions."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">Role Name</Label>
              <Input
                id="roleName"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g., Inventory Clerk"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleDescription">Description</Label>
              <Textarea
                id="roleDescription"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                placeholder="Briefly describe this role's responsibilities."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Features / Permissions</Label>
              <ScrollArea className="h-60 border border-border rounded-md p-3 bg-muted/20">
                <div className="space-y-2">
                  {availableFeatures.map(feature => (
                    <div key={feature} className="flex items-center space-x-2">
                      <Checkbox
                        id={`feature-${feature}`}
                        checked={selectedFeatures.has(feature)}
                        onCheckedChange={(checked: boolean) => handleFeatureToggle(feature, checked)}
                      />
                      <Label htmlFor={`feature-${feature}`}>{feature}</Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEditRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole}>
              {roleToEdit ? "Save Changes" : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      {roleToDelete && (
        <ConfirmDialog
          isOpen={isConfirmDeleteDialogOpen}
          onClose={() => setIsConfirmDeleteDialogOpen(false)}
          onConfirm={confirmDeleteRole}
          title="Confirm Role Deletion"
          description={`Are you sure you want to delete the custom role "${roleToDelete.name}"? This action cannot be undone.`}
          confirmText="Delete Role"
          cancelText="Cancel"
        />
      )}
    </>
  );
};

export default ManageCustomRolesDialog;