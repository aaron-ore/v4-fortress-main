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
import { PackageCheck } from "lucide-react";

interface FulfillOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const FulfillOrderDialog: React.FC<FulfillOrderDialogProps> = ({ isOpen, onClose }) => {
  const { orders, updateOrder } = useOrders();
  const { inventoryItems, updateInventoryItem, refreshInventory } = useInventory();
  const { addStockMovement } = useStockMovement();

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [fulfilledItems, setFulfilledItems] = useState<{ itemId: string; quantity: number }[]>([]);
  const [notes, setNotes] = useState("");

  const salesOrders = orders.filter(order => order.type === "Sales" && order.status !== "Shipped" && order.status !== "Packed");

  React.useEffect(() => {
    if (isOpen) {
      setSelectedOrderId("");
      setFulfilledItems([]);
      setNotes("");
    }
  }, [isOpen]);

  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    const order = orders.find(o => o.id === orderId);
    if (order) {
      // Mock items for the selected Sales Order
      setFulfilledItems(inventoryItems.slice(0, Math.min(order.itemCount, 3)).map(item => ({
        itemId: item.id,
        quantity: 0, // Default to 0, user will input
      })));
    } else {
      setFulfilledItems([]);
    }
  };

  const handleItemQuantityChange = (itemId: string, quantity: string) => {
    setFulfilledItems(prev =>
      prev.map(item =>
        item.itemId === itemId ? { ...item, quantity: parseInt(quantity) || 0 } : item
      )
    );
  };

  const handleSubmit = async () => {
    if (!selectedOrderId) {
      showError("Please select a Sales Order.");
      return;
    }
    if (fulfilledItems.every(item => item.quantity === 0)) {
      showError("Please enter quantities for items to fulfill.");
      return;
    }

    const order = orders.find(o => o.id === selectedOrderId);
    if (!order) {
      showError("Selected order not found.");
      return;
    }

    let allUpdatesSuccessful = true;

    for (const fulfilledItem of fulfilledItems) {
      if (fulfilledItem.quantity > 0) {
        const inventoryItem = inventoryItems.find(inv => inv.id === fulfilledItem.itemId);
        if (inventoryItem) {
          if (inventoryItem.quantity < fulfilledItem.quantity) {
            showError(`Not enough stock for ${inventoryItem.name}. Available: ${inventoryItem.quantity}`);
            allUpdatesSuccessful = false;
            break;
          }
          const oldQuantity = inventoryItem.quantity;
          const newQuantity = oldQuantity - fulfilledItem.quantity;
          const updatedInventoryItem = {
            ...inventoryItem,
            quantity: newQuantity,
            committedStock: Math.max(0, inventoryItem.committedStock - fulfilledItem.quantity), // Deduct from committed
            lastUpdated: new Date().toISOString().split('T')[0],
          };
          await updateInventoryItem(updatedInventoryItem);
          await addStockMovement({
            itemId: inventoryItem.id,
            itemName: inventoryItem.name,
            type: "subtract",
            amount: fulfilledItem.quantity,
            oldQuantity: oldQuantity,
            newQuantity: newQuantity,
            reason: `Fulfilled for SO ${selectedOrderId}`,
          });
        } else {
          showError(`Item ${fulfilledItem.itemId} not found in inventory.`);
          allUpdatesSuccessful = false;
          break;
        }
      }
    }

    if (allUpdatesSuccessful) {
      // Update Order status
      const updatedOrder: OrderItem = { ...order, status: "Packed", notes: notes || order.notes };
      updateOrder(updatedOrder);
      showSuccess(`Order ${selectedOrderId} fulfilled and packed! Inventory updated.`);
      refreshInventory(); // Ensure inventory context is refreshed
      onClose();
    } else {
      showError("Order fulfillment failed for some items. Check console for details.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-6 w-6 text-primary" /> Fulfill Order
          </DialogTitle>
          <DialogDescription>
            Process a sales order for fulfillment and update inventory.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="soSelect">Select Sales Order</Label>
            <Select value={selectedOrderId} onValueChange={handleOrderChange}>
              <SelectTrigger id="soSelect">
                <SelectValue placeholder="Select a Sales Order" />
              </SelectTrigger>
              <SelectContent>
                {salesOrders.length > 0 ? (
                  salesOrders.map(so => (
                    <SelectItem key={so.id} value={so.id}>
                      {so.id} - {so.customerSupplier} (Due: {so.dueDate})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-sos" disabled>No pending Sales Orders</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedOrderId && (
            <div className="space-y-2">
              <Label>Items to Fulfill</Label>
              {fulfilledItems.length > 0 ? (
                <div className="space-y-2 border border-border rounded-md p-3 bg-muted/20">
                  {fulfilledItems.map(item => {
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
                          max={invItem.quantity} // Max quantity is current stock
                          className="w-1/3"
                        />
                      </div>
                    ) : null;
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No items found for this SO or SO not selected.</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this fulfillment..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedOrderId || fulfilledItems.every(item => item.quantity === 0)}>
            Fulfill Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FulfillOrderDialog;