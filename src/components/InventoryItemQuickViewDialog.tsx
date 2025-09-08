"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import ConfirmDialog from "@/components/ConfirmDialog";
import { showSuccess, showError } from "@/utils/toast";
import { useInventory, InventoryItem } from "@/context/InventoryContext"; // Corrected import
import { useStockMovement } from "@/context/StockMovementContext";
import { useOrders, OrderItem, POItem } from "@/context/OrdersContext";
import { useVendors } from "@/context/VendorContext";
import { processAutoReorder } from "@/utils/autoReorderLogic";
import { useNavigate } from "react-router-dom";
import { Package, Tag, Scale, DollarSign, ArrowUp, ArrowDown, Trash2, History, Repeat } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { generateQrCodeSvg } from "@/utils/qrCodeGenerator"; // Import QR code generator

interface InventoryItemQuickViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
}

const adjustmentReasons = [
  "Received",
  "Damaged",
  "Lost",
  "Returned",
  "Cycle Count Adjustment",
  "Other",
];

const InventoryItemQuickViewDialog: React.FC<InventoryItemQuickViewDialogProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const { inventoryItems, updateInventoryItem, deleteInventoryItem, refreshInventory } = useInventory();
  const { stockMovements, addStockMovement, fetchStockMovements } = useStockMovement();
  const { addOrder } = useOrders();
  const { vendors } = useVendors();
  const navigate = useNavigate();

  const currentItem = useMemo(() => {
    return item ? inventoryItems.find(invItem => invItem.id === item.id) : null;
  }, [item, inventoryItems]);

  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"add" | "subtract">("add");
  const [adjustmentTarget, setAdjustmentTarget] = useState<"pickingBin" | "overstock">("pickingBin");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [autoReorderEnabled, setAutoReorderEnabled] = useState(false);
  const [autoReorderQuantity, setAutoReorderQuantity] = useState("");
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null); // State for QR code SVG

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);

  const prevItemIdRef = useRef<string | null>(null);

  // Filter stock movements for the current item
  const itemStockMovements = useMemo(() => {
    return stockMovements
      .filter(movement => movement.itemId === currentItem?.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [stockMovements, currentItem]);

  useEffect(() => {
    if (isOpen) {
      if (currentItem?.id !== prevItemIdRef.current) {
        setAdjustmentAmount("");
        setAdjustmentType("add");
        setAdjustmentTarget("pickingBin");
        setAdjustmentReason("");
        setAutoReorderEnabled(currentItem?.autoReorderEnabled || false);
        setAutoReorderQuantity(currentItem?.autoReorderQuantity?.toString() || "");
        prevItemIdRef.current = currentItem?.id || null;
      }
      if (currentItem) {
        fetchStockMovements(currentItem.id);
        // Generate QR code SVG from item.barcodeUrl (raw data)
        const generateAndSetQr = async () => {
          if (currentItem.barcodeUrl) {
            try {
              const svg = await generateQrCodeSvg(currentItem.barcodeUrl, 100);
              setQrCodeSvg(svg);
            } catch (error) {
              console.error("Error generating QR code for quick view display:", error);
              setQrCodeSvg(null);
            }
          } else {
            setQrCodeSvg(null);
          }
        };
        generateAndSetQr();
      }
    } else {
      prevItemIdRef.current = null;
      setQrCodeSvg(null); // Clear QR code when dialog closes
    }
  }, [isOpen, currentItem, fetchStockMovements]);

  const handleAdjustStock = async () => {
    if (!currentItem) return;

    const amount = parseInt(adjustmentAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Please enter a valid positive number for adjustment.");
      return;
    }
    if (!adjustmentReason) {
      showError("Please select a reason for the stock adjustment.");
      return;
    }

    let newPickingBinQuantity = currentItem.pickingBinQuantity;
    let newOverstockQuantity = currentItem.overstockQuantity;
    const oldQuantity = currentItem.quantity; // Total old quantity

    if (adjustmentTarget === "pickingBin") {
      if (adjustmentType === "add") {
        newPickingBinQuantity += amount;
      } else {
        if (newPickingBinQuantity < amount) {
          showError("Cannot subtract more than available stock in picking bin.");
          return;
        }
        newPickingBinQuantity -= amount;
      }
    } else { // overstock
      if (adjustmentType === "add") {
        newOverstockQuantity += amount;
      } else {
        if (newOverstockQuantity < amount) {
          showError("Cannot subtract more than available stock in overstock.");
          return;
        }
        newOverstockQuantity -= amount;
      }
    }

    const updatedItem: Omit<InventoryItem, "quantity"> & { id: string } = {
      ...currentItem,
      pickingBinQuantity: newPickingBinQuantity,
      overstockQuantity: newOverstockQuantity,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    await updateInventoryItem(updatedItem);

    // Log stock movement
    await addStockMovement({
      itemId: currentItem.id,
      itemName: currentItem.name,
      type: adjustmentType,
      amount: amount,
      oldQuantity: oldQuantity, // Log total old quantity
      newQuantity: newPickingBinQuantity + newOverstockQuantity, // Log total new quantity
      reason: `${adjustmentReason} (${adjustmentTarget === "pickingBin" ? "Picking Bin" : "Overstock"})`,
    });

    await refreshInventory();
    showSuccess(`Stock for ${currentItem.name} adjusted by ${adjustmentType === 'add' ? '+' : '-'}${amount} in ${adjustmentTarget === "pickingBin" ? "Picking Bin" : "Overstock"} due to: ${adjustmentReason}. New total quantity: ${newPickingBinQuantity + newOverstockQuantity}.`);
    onClose();
  };

  const handleToggleAutoReorder = async (checked: boolean) => {
    if (!currentItem) return;
    setAutoReorderEnabled(checked);

    const parsedAutoReorderQuantity = parseInt(autoReorderQuantity) || 0;
    if (checked && (isNaN(parsedAutoReorderQuantity) || parsedAutoReorderQuantity <= 0)) {
      showError("Please set a valid positive quantity for auto-reorder before enabling.");
      setAutoReorderEnabled(false); // Revert toggle if invalid
      return;
    }

    const updatedItem: Omit<InventoryItem, "quantity"> & { id: string } = {
      ...currentItem,
      autoReorderEnabled: checked,
      autoReorderQuantity: parsedAutoReorderQuantity,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    await updateInventoryItem(updatedItem);
    showSuccess(`Auto-reorder for ${currentItem.name} ${checked ? "enabled" : "disabled"}.`);
  };

  const handleAutoReorderQuantityChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentItem) return;
    const newQty = parseInt(e.target.value) || 0;
    setAutoReorderQuantity(e.target.value);

    if (newQty > 0) {
      const updatedItem: Omit<InventoryItem, "quantity"> & { id: string } = {
        ...currentItem,
        autoReorderQuantity: newQty,
        lastUpdated: new Date().toISOString().split('T')[0],
      };
      await updateInventoryItem(updatedItem);
      showSuccess(`Auto-reorder quantity for ${currentItem.name} updated to ${newQty}.`);
    }
  };

  const handleManualReorder = async () => {
    if (!currentItem || !currentItem.vendorId) {
      showError("Cannot manually reorder: Item or vendor not specified.");
      return;
    }
    if (currentItem.autoReorderQuantity <= 0) {
      showError("Please set a positive auto-reorder quantity before manually reordering.");
      return;
    }

    const vendor = vendors.find(v => v.id === currentItem.vendorId);
    if (!vendor) {
      showError(`Cannot manually reorder: Vendor for ${currentItem.name} not found.`);
      return;
    }

    const poItems: POItem[] = [{
      id: Date.now(),
      itemName: currentItem.name,
      quantity: currentItem.autoReorderQuantity,
      unitPrice: currentItem.unitCost,
      inventoryItemId: currentItem.id,
    }];

    const newPoNumber = `PO${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`; // Simple mock PO number
    const totalAmount = poItems.reduce((sum, poItem) => sum + poItem.quantity * poItem.unitPrice, 0);

    const newPurchaseOrder = {
      type: "Purchase" as "Purchase",
      customerSupplier: vendor.name,
      date: new Date().toISOString().split("T")[0],
      status: "New Order" as "New Order",
      totalAmount: totalAmount,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      itemCount: poItems.length,
      notes: `Manually triggered reorder for ${currentItem.name}.`,
      orderType: "Wholesale" as "Wholesale",
      shippingMethod: "Standard" as "Standard",
      items: poItems,
      terms: "Net 30",
    };

    try {
      await addOrder(newPurchaseOrder);
      showSuccess(`Manual reorder placed for ${currentItem.name} (PO: ${newPoNumber}). Email simulated to ${vendor.email || 'vendor'}.`);
      console.log(`Simulating email to ${vendor.email} for PO ${newPoNumber} with items:`, poItems);
      onClose();
    } catch (error: any) {
      showError(`Failed to place manual reorder: ${error.message}`);
    }
  };

  const handleDeleteItemClick = () => {
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteItem = async () => {
    if (!currentItem) return;
    await deleteInventoryItem(currentItem.id);
    showSuccess(`${currentItem.name} has been deleted.`);
    setIsConfirmDeleteDialogOpen(false);
    onClose();
  };

  const handleViewFullDetails = () => {
    if (currentItem) {
      navigate(`/inventory/${currentItem.id}`);
      onClose();
    }
  };

  if (!currentItem) {
    return null;
  }

  let statusVariant: "success" | "warning" | "destructive" | "info" | "muted" = "info";
  switch (currentItem.status) {
    case "In Stock":
      statusVariant = "success";
      break;
    case "Low Stock":
      statusVariant = "warning";
      break;
    case "Out of Stock":
      statusVariant = "destructive";
      break;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" /> {currentItem.name}
          </DialogTitle>
          <DialogDescription>
            Quick overview and stock adjustment for this item.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Product Image */}
          <div className="flex justify-center mb-4">
            {currentItem.imageUrl ? (
              <img src={currentItem.imageUrl} alt={currentItem.name} className="max-h-48 max-w-full object-contain rounded-md border border-border" />
            ) : (
              <div className="h-48 w-48 bg-muted/30 rounded-md flex items-center justify-center text-muted-foreground">
                No Image
              </div>
            )}
          </div>

          {/* Basic Item Info */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">SKU:</span> {currentItem.sku}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Item ID:</span> {currentItem.id}
            </div>
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Category:</span> {currentItem.category}
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Retail Price:</span> ${currentItem.retailPrice.toFixed(2)}
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <span className="font-semibold text-lg text-foreground">Total Stock: {currentItem.quantity} units</span>
              <Badge variant={statusVariant} className="ml-2">
                {currentItem.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <span className="font-semibold text-base text-foreground">Picking Bin: {currentItem.pickingBinQuantity} units</span>
              <span className="font-semibold text-base text-foreground ml-4">Overstock: {currentItem.overstockQuantity} units</span>
            </div>
            {qrCodeSvg && ( // Display QR code if available
              <div className="col-span-2 mt-2 p-4 border border-border rounded-md bg-white flex justify-center">
                <div dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />
              </div>
            )}
          </div>

          {/* Stock Adjustment Section */}
          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="text-lg font-semibold mb-3">Adjust Stock</h3>
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label htmlFor="adjustmentAmount">Adjustment Quantity</Label>
                <Input
                  id="adjustmentAmount"
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder="e.g., 10"
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Adjustment Type</Label>
                <RadioGroup
                  value={adjustmentType}
                  onValueChange={(value: "add" | "subtract") => setAdjustmentType(value)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="add" id="add-stock" />
                    <Label htmlFor="add-stock" className="flex items-center gap-1">
                      <ArrowUp className="h-4 w-4 text-green-500" /> Add Stock
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="subtract" id="subtract-stock" />
                    <Label htmlFor="subtract-stock" className="flex items-center gap-1">
                      <ArrowDown className="h-4 w-4 text-red-500" /> Remove Stock
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Adjustment Target</Label>
                <RadioGroup
                  value={adjustmentTarget}
                  onValueChange={(value: "pickingBin" | "overstock") => setAdjustmentTarget(value)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pickingBin" id="target-picking-bin" />
                    <Label htmlFor="target-picking-bin">Picking Bin</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="overstock" id="target-overstock" />
                    <Label htmlFor="target-overstock">Overstock</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjustmentReason">Reason</Label>
                <Select value={adjustmentReason} onValueChange={setAdjustmentReason}>
                  <SelectTrigger id="adjustmentReason">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {adjustmentReasons.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdjustStock} className="w-full mt-2">
                Apply Adjustment
              </Button>
            </div>
          </div>

          {/* NEW: Auto-Reorder Settings */}
          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Repeat className="h-5 w-5 text-primary" /> Auto-Reorder Settings
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="autoReorderEnabled">Enable Auto-Reorder</Label>
                <Switch
                  id="autoReorderEnabled"
                  checked={autoReorderEnabled}
                  onCheckedChange={handleToggleAutoReorder}
                />
              </div>
              {autoReorderEnabled && (
                <div className="space-y-2 mt-2">
                  <Label htmlFor="autoReorderQuantity">Quantity to Auto-Reorder</Label>
                  <Input
                    id="autoReorderQuantity"
                    type="number"
                    value={autoReorderQuantity}
                    onChange={(e) => setAutoReorderQuantity(e.target.value)}
                    placeholder="e.g., 50"
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground">
                    This quantity will be ordered when stock drops to or below the overall reorder level.
                  </p>
                </div>
              )}
              <Button
                onClick={handleManualReorder}
                className="w-full mt-2"
                disabled={!currentItem.vendorId || currentItem.autoReorderQuantity <= 0}
              >
                Manually Reorder Now
              </Button>
            </div>
          </div>

          {/* Stock Movement History */}
          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" /> Stock Movement History
            </h3>
            {itemStockMovements.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {itemStockMovements.map((movement) => (
                  <li key={movement.id} className="flex justify-between items-center p-2 bg-muted/10 rounded-md">
                    <span className="flex items-center gap-2">
                      {movement.type === "add" ? (
                        <ArrowUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium">
                        {movement.type === "add" ? "+" : "-"}
                        {movement.amount} units
                      </span>
                      <span className="text-muted-foreground">({movement.reason})</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(movement.timestamp), "MMM dd, HH:mm")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground text-sm py-4">No stock movement history for this item.</p>
            )}
          </div>
        </div>
        <DialogFooter className="flex justify-between items-center mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <div className="flex space-x-2">
            <Button variant="destructive" onClick={handleDeleteItemClick}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete Item
            </Button>
            <Button variant="secondary" onClick={handleViewFullDetails}>
              View Full Details
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
      {currentItem && (
        <ConfirmDialog
          isOpen={isConfirmDeleteDialogOpen}
          onClose={() => setIsConfirmDeleteDialogOpen(false)}
          onConfirm={confirmDeleteItem}
          title="Confirm Item Deletion"
          description={`Are you sure you want to delete "${currentItem.name}" (SKU: ${currentItem.sku})? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </Dialog>
  );
};

export default InventoryItemQuickViewDialog;