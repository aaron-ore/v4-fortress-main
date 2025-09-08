"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import CycleCountTool from "@/components/warehouse-operations/CycleCountTool";
import { CheckCircle } from "lucide-react";

interface CycleCountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onScanRequest: (callback: (scannedData: string) => void) => void;
  scannedDataFromGlobal?: string | null;
  onScannedDataProcessed: () => void;
}

const CycleCountDialog: React.FC<CycleCountDialogProps> = ({
  isOpen,
  onClose,
  onScanRequest,
  scannedDataFromGlobal,
  onScannedDataProcessed,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] flex flex-col h-[90vh] max-h-[700px] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-primary" /> Cycle Count
          </DialogTitle>
          <DialogDescription>
            Perform inventory counts and reconcile discrepancies.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-hidden p-4 pt-0">
          <CycleCountTool
            onScanRequest={onScanRequest}
            scannedDataFromGlobal={scannedDataFromGlobal}
            onScannedDataProcessed={onScannedDataProcessed}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CycleCountDialog;