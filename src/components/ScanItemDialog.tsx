import React, { useState } from "react";
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
import { showSuccess, showError } from "@/utils/toast";
import { useInventory } from "@/context/InventoryContext";

interface ScanItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ScanItemDialog: React.FC<ScanItemDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { inventoryItems } = useInventory();
  const [barcode, setBarcode] = useState("");

  const handleScan = () => {
    if (!barcode) {
      showError("Please enter a barcode or SKU to scan.");
      return;
    }

    const foundItem = inventoryItems.find(
      (item) => item.sku === barcode || item.id === barcode,
    );

    if (foundItem) {
      showSuccess(`Item found: ${foundItem.name} (SKU: ${foundItem.sku})`);
      // In a real application, you might navigate to the item's edit page or show its details
    } else {
      showError(`No item found with barcode/SKU: ${barcode}`);
    }

    setBarcode(""); // Clear input after scan attempt
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Scan Item</DialogTitle>
          <DialogDescription>
            Enter the barcode or SKU of the item to quickly look it up.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="barcode" className="text-right">
              Barcode/SKU
            </Label>
            <Input
              id="barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="col-span-3"
              placeholder="Enter barcode or SKU"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleScan();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleScan}>Scan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScanItemDialog;