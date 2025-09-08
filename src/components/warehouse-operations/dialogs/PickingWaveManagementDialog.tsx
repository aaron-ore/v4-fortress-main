"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import PickingWaveManagementTool from "@/components/warehouse-operations/PickingWaveManagementTool";
import { ListOrdered } from "lucide-react";

interface PickingWaveManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const PickingWaveManagementDialog: React.FC<PickingWaveManagementDialogProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] flex flex-col h-[90vh] max-h-[800px] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <ListOrdered className="h-6 w-6 text-primary" /> Picking Wave Management
          </DialogTitle>
          <DialogDescription>
            Batch sales orders into efficient picking waves.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-hidden p-4 pt-0">
          <PickingWaveManagementTool />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PickingWaveManagementDialog;