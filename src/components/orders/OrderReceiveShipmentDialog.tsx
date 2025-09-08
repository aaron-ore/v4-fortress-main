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
import { useOrders, OrderItem } from "@/context/OrdersContext";
import { useInventory } from "@/context/InventoryContext";
import { useStockMovement } from "@/context/StockMovementContext";
import { PackagePlus } from "lucide-react";

interface ReceiveShipmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReceiveShipmentDialog: React.FC<ReceiveShipmentDialogProps> = ({ isOpen, onClose }) => {
  const { orders, updateOrder } = useOrders();
  const { inventoryItems, updateInventoryItem, refreshInventory } = useInventory();
  const { addStockMovement } = useStockMovement();

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [receivedItems, setReceivedItems] = useState<{ itemId: string; quantity: number }[]>([]);
  const [notes, setNotes] = useState("");

  const purchaseOrders = orders.filter(order => order.type === "Purchase" && order.status !== "Shipped");

  React.useEffect(() => {
    if (isOpen) {
      setSelectedOrderId("");
      setReceivedItems([]);
      setNotes("");
    }
  }, [isOpen]);

  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    // In a real app, you'd fetch items for this PO. For now, mock or assume.
    const order = orders.find(o => o.id === orderId);
    if (order) {
      // Mock items for the selected PO
      setReceivedItems(inventoryItems.slice(0, Math.min(order.itemCount, 3)).map(item => ({
        itemId: item.id,
        quantity: 0, // Default to 0, user will input
      })));
    } else {
      setReceivedItems([]);
    }
  };

  const handleItemQuantityChange = (itemId: string, quantity: string) => {
    setReceivedItems(prev =>
      prev.map(item =>
        item.itemId === itemId ? { ...item, quantity: parseInt(quantity) || 0 } : item
      )
    );
  };

  const handleSubmit = async () => {
    if (!selectedOrderId) {
      showError("Please select a Purchase Order.");
      return;
    }
    if (receivedItems.every(item => item.quantity === 0)) {
      showError("Please enter quantities for items received.");
      return;
    }

    const order = orders.find(o => o.id === selectedOrderId);
    if (!order) {
      showError("Selected order not found.");
      return;
    }

    let allUpdatesSuccessful = true;

    for (const receivedItem of receivedItems) {
      if (receivedItem.quantity > 0) {
        const inventoryItem = inventoryItems.find(inv => inv.id === receivedItem.itemId);
        if (inventoryItem) {
          const oldQuantity = inventoryItem.quantity;
          const newQuantity = oldQuantity + receivedItem.quantity;
          const updatedInventoryItem = {
            ...inventoryItem,
            quantity: newQuantity,
            incomingStock: Math.max(0, inventoryItem.incomingStock - receivedItem.quantity), // Deduct from incoming
            lastUpdated: new Date().toISOString().split('T')[0],
          };
          await updateInventoryItem(updatedInventoryItem);
          await addStockMovement({
            itemId: inventoryItem.id,
            itemName: inventoryItem.name,
            type: "add",
            amount: receivedItem.quantity,
            oldQuantity: oldQuantity,
            newQuantity: newQuantity,
            reason: `Received from PO ${selectedOrderId}`,
          });
        } else {
          showError(`Item ${receivedItem.itemId} not found in inventory.`);
          allUpdatesSuccessful = false;
        }
      }
    }

    if (allUpdatesSuccessful) {
      // Update PO status (e.g., to 'Shipped' or 'Partially Received')
      const updatedOrder: OrderItem = { ...order, status: "Shipped", notes: notes || order.notes };
      updateOrder(updatedOrder);
      showSuccess(`Shipment for PO ${selectedOrderId} received successfully! Inventory updated.`);
      refreshInventory(); // Ensure inventory context is refreshed
      onClose();
    } else {
      showError("Some items could not be updated. Check console for details.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-6 w-6 text-primary" /> Receive Shipment
          </DialogTitle>
          <DialogDescription>
            Mark a purchase order as received and update inventory.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="poSelect">Select Purchase Order</Label>
            <Select value={selectedOrderId} onValueChange={handleOrderChange}>
              <SelectTrigger id="poSelect">
                <SelectValue placeholder="Select a Purchase Order" />
              </SelectTrigger>
              <SelectContent>
                {purchaseOrders.length > 0 ? (
                  purchaseOrders.map(po => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.id} - {po.customerSupplier} (Due: {po.dueDate})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-pos" disabled>No pending Purchase Orders</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedOrderId && (
            <div className="space-y-2">
              <Label>Items to Receive</Label>
              {receivedItems.length > 0 ? (
                <div className="space-y-2 border border-border rounded-md p-3 bg-muted/20">
                  {receivedItems.map(item => {
                    const invItem = inventoryItems.find(inv => inv.id === item.itemId);
                    return invItem ? (
                      <div key={item.itemId} className="flex items-center gap-2">
                        <Label className="w-2/3 truncate">{invItem.name} (SKU: {invItem.sku})</Label>
                        <Input
                          type="number"
                          value={item.quantity === 0 ? "" : item.quantity}
                          onChange={(e) => handleItemQuantityChange(item.itemId, e.target.value)}
                          placeholder="Qty"
                          min="0"
                          className="w-1/3"
                        />
                      </div>
                    ) : null;
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No items found for this PO or PO not selected.</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this shipment..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedOrderId || receivedItems.every(item => item.quantity === 0)}>
            Receive Shipment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiveShipmentDialog;