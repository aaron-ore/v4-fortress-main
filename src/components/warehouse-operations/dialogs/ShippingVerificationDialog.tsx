"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ShippingVerificationTool from "@/components/warehouse-operations/ShippingVerificationTool";
import { CheckCircle } from "lucide-react";

interface ShippingVerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onScanRequest: (callback: (scannedData: string) => void) => void;
  scannedDataFromGlobal?: string | null;
  onScannedDataProcessed: () => void;
}

const ShippingVerificationDialog: React.FC<ShippingVerificationDialogProps> = ({
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
            <CheckCircle className="h-6 w-6 text-primary" /> Shipping Verification
          </DialogTitle>
          <DialogDescription>
            Verify items before loading onto a truck for shipment.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-hidden p-4 pt-0">
          <ShippingVerificationTool
            onScanRequest={onScanRequest}
            scannedDataFromGlobal={scannedDataFromGlobal}
            onScannedDataProcessed={onScannedDataProcessed}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShippingVerificationDialog;