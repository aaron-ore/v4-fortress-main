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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError } from "@/utils/toast";
import { useInventory } from "@/context/InventoryContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useStockMovement } from "@/context/StockMovementContext";
import { Truck } from "lucide-react";

interface TransferStockDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const TransferStockDialog: React.FC<TransferStockDialogProps> = ({ isOpen, onClose }) => {
  const { inventoryItems, updateInventoryItem, refreshInventory } = useInventory();
  const { locations } = useOnboarding();
  const { addStockMovement } = useStockMovement();

  const [selectedItemId, setSelectedItemId] = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [transferQuantity, setTransferQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const selectedItem = inventoryItems.find(item => item.id === selectedItemId);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedItemId("");
      setFromLocation("");
      setToLocation("");
      setTransferQuantity("");
      setNotes("");
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (selectedItem) {
      setFromLocation(selectedItem.location);
    } else {
      setFromLocation("");
    }
  }, [selectedItem]);

  const handleSubmit = async () => {
    if (!selectedItemId || !fromLocation || !toLocation || !transferQuantity) {
      showError("Please fill in all required fields.");
      return;
    }
    if (fromLocation === toLocation) {
      showError("Source and destination locations cannot be the same.");
      return;
    }

    const quantity = parseInt(transferQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      showError("Please enter a valid positive quantity to transfer.");
      return;
    }
    if (!selectedItem) {
      showError("Selected item not found.");
      return;
    }
    if (selectedItem.quantity < quantity) {
      showError(`Not enough stock at ${fromLocation}. Available: ${selectedItem.quantity}`);
      return;
    }

    const oldQuantity = selectedItem.quantity;
    const newQuantity = selectedItem.quantity - quantity; // Deduct from source
    const updatedItem = {
      ...selectedItem,
      quantity: newQuantity,
      location: toLocation, // Update location to destination
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    await updateInventoryItem(updatedItem);

    // Log stock movement for the transfer
    await addStockMovement({
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      type: "subtract", // Log as subtract from old location
      amount: quantity,
      oldQuantity: oldQuantity,
      newQuantity: newQuantity,
      reason: `Transferred from ${fromLocation} to ${toLocation}`,
    });

    // For a full transfer, you might also need to add to the destination location's stock.
    // In this simplified model, we're just moving the item's location and updating its quantity.
    // If items were truly separate entities per location, this would be more complex.

    showSuccess(`Transferred ${quantity} units of ${selectedItem.name} from ${fromLocation} to ${toLocation}.`);
    refreshInventory(); // Ensure inventory context is refreshed
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" /> Transfer Stock
          </DialogTitle>
          <DialogDescription>
            Move inventory items between different storage locations.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="itemSelect">Select Item</Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger id="itemSelect">
                <SelectValue placeholder="Select an inventory item" />
              </SelectTrigger>
              <SelectContent>
                {inventoryItems.length > 0 ? (
                  inventoryItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} (SKU: {item.sku}) - Qty: {item.quantity}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-items" disabled>No inventory items available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedItem && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromLocation">From Location</Label>
                  <Input id="fromLocation" value={fromLocation} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toLocation">To Location</Label>
                  <Select value={toLocation} onValueChange={setToLocation}>
                    <SelectTrigger id="toLocation">
                      <SelectValue placeholder="Select destination location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.filter(loc => loc.fullLocationString !== fromLocation).map(loc => (
                        <SelectItem key={loc.id} value={loc.fullLocationString}>
                          {loc.displayName || loc.fullLocationString}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transferQuantity">Quantity to Transfer</Label>
                <Input
                  id="transferQuantity"
                  type="number"
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(e.target.value)}
                  placeholder="e.g., 50"
                  min="1"
                  max={selectedItem.quantity}
                />
                <p className="text-xs text-muted-foreground">Available: {selectedItem.quantity} units</p>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this transfer..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedItemId || !fromLocation || !toLocation || !transferQuantity || fromLocation === toLocation}>
            Transfer Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferStockDialog;