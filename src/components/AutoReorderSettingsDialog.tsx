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
import { Switch } from "@/components/ui/switch";
import { showSuccess, showError } from "@/utils/toast";
import { Settings, Repeat } from "lucide-react";

interface AutoReorderSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const AutoReorderSettingsDialog: React.FC<AutoReorderSettingsDialogProps> = ({ isOpen, onClose }) => {
  const [defaultReorderLevel, setDefaultReorderLevel] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("autoReorderDefaultLevel") || "10";
    }
    return "10";
  });
  const [enableAutoReorderNotifications, setEnableAutoReorderNotifications] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("enableAutoReorderNotifications") === "true";
    }
    return true;
  });
  const [enableAutoReorder, setEnableAutoReorder] = useState<boolean>(() => { // NEW: State for global auto-reorder
    if (typeof window !== 'undefined') {
      return localStorage.getItem("enableAutoReorder") === "true";
    }
    return false; // Default to false
  });

  useEffect(() => {
    if (isOpen) {
      // Load settings when dialog opens
      if (typeof window !== 'undefined') {
        setDefaultReorderLevel(localStorage.getItem("autoReorderDefaultLevel") || "10");
        setEnableAutoReorderNotifications(localStorage.getItem("enableAutoReorderNotifications") === "true");
        setEnableAutoReorder(localStorage.getItem("enableAutoReorder") === "true"); // Load new setting
      }
    }
  }, [isOpen]);

  const handleSaveSettings = () => {
    const parsedLevel = parseInt(defaultReorderLevel);
    if (isNaN(parsedLevel) || parsedLevel < 0) {
      showError("Default Reorder Level must be a non-negative number.");
      return;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem("autoReorderDefaultLevel", defaultReorderLevel);
      localStorage.setItem("enableAutoReorderNotifications", String(enableAutoReorderNotifications));
      localStorage.setItem("enableAutoReorder", String(enableAutoReorder)); // Save new setting
    }
    showSuccess("Auto-reorder settings saved successfully!");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-6 w-6 text-primary" /> Auto-Reorder Settings
          </DialogTitle>
          <DialogDescription>
            Configure global rules for automatic reordering and notifications.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="defaultReorderLevel">Default Reorder Level</Label>
            <Input
              id="defaultReorderLevel"
              type="number"
              value={defaultReorderLevel}
              onChange={(e) => setDefaultReorderLevel(e.target.value)}
              placeholder="e.g., 10"
              min="0"
            />
            <p className="text-xs text-muted-foreground">
              This value will be suggested for new items' reorder levels.
            </p>
          </div>
          <div className="flex items-center justify-between space-x-2 pt-2">
            <Label htmlFor="enableAutoReorder">
              Enable Global Auto-Reorder System
            </Label>
            <Switch
              id="enableAutoReorder"
              checked={enableAutoReorder}
              onCheckedChange={setEnableAutoReorder}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            When enabled, items with individual auto-reorder settings will trigger purchase orders.
          </p>
          <div className="flex items-center justify-between space-x-2 pt-2">
            <Label htmlFor="enableAutoReorderNotifications">
              Enable Auto-Reorder Notifications
            </Label>
            <Switch
              id="enableAutoReorderNotifications"
              checked={enableAutoReorderNotifications}
              onCheckedChange={setEnableAutoReorderNotifications}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Receive alerts when items hit their reorder level.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSaveSettings}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AutoReorderSettingsDialog;