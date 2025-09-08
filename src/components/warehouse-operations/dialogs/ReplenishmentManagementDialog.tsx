"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ReplenishmentManagementTool from "@/components/warehouse-operations/ReplenishmentManagementTool";
import { Repeat } from "lucide-react";

interface ReplenishmentManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReplenishmentManagementDialog: React.FC<ReplenishmentManagementDialogProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] flex flex-col h-[90vh] max-h-[800px] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-6 w-6 text-primary" /> Replenishment Management
          </DialogTitle>
          <DialogDescription>
            Manage tasks for moving stock from overstock to picking bins.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-hidden p-4 pt-0">
          <ReplenishmentManagementTool />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReplenishmentManagementDialog;