import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Package, Truck } from "lucide-react";

interface SupplierInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  itemSku: string;
}

const SupplierInfoDialog: React.FC<SupplierInfoDialogProps> = ({
  isOpen,
  onClose,
  itemName,
  itemSku,
}) => {
  // Mock supplier data - in a real app, this would come from a database
  const supplier = {
    name: "Global Supply Co.",
    contactPerson: "Jane Doe",
    email: "jane.doe@globalsupply.com",
    phone: "+1 (555) 987-6543",
    address: "456 Industrial Way, Supply City, SC 98765",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" /> Supplier for "{itemName}"
          </DialogTitle>
          <DialogDescription>
            Details for the primary supplier of {itemName} (SKU: {itemSku}).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-sm">
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Supplier Name:</p>
            <p className="text-muted-foreground">{supplier.name}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Contact Person:</p>
            <p className="text-muted-foreground">{supplier.contactPerson}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Email:</p>
            <p className="text-muted-foreground">{supplier.email}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Phone:</p>
            <p className="text-muted-foreground">{supplier.phone}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Address:</p>
            <p className="text-muted-foreground">{supplier.address}</p>
          </div>
          <div className="mt-4 p-3 bg-muted/20 rounded-md text-xs text-muted-foreground">
            <p>
              <Package className="inline h-3 w-3 mr-1" />
              In a real application, you would have a dedicated supplier management system and link items to specific suppliers. This is a placeholder for demonstration.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierInfoDialog;