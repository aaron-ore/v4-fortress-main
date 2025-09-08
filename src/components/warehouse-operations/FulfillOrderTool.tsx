"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Barcode, CheckCircle, ShoppingCart, MapPin } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showSuccess, showError } from "@/utils/toast";
import { useOrders, OrderItem, POItem } from "@/context/OrdersContext";
import { useInventory, InventoryItem } from "@/context/InventoryContext";
import { useStockMovement } from "@/context/StockMovementContext";

interface FulfilledItemDisplay extends POItem {
  fulfilledQuantity: number;
  inventoryItemDetails?: InventoryItem;
}

interface FulfillOrderToolProps {
  onScanRequest: (callback: (scannedData: string) => void) => void;
  scannedDataFromGlobal?: string | null;
  onScannedDataProcessed: () => void;
}

const FulfillOrderTool: React.FC<FulfillOrderToolProps> = ({ onScanRequest, scannedDataFromGlobal, onScannedDataProcessed }) => {
  const { orders, fetchOrders, updateOrder } = useOrders();
  const { inventoryItems, refreshInventory, updateInventoryItem } = useInventory();
  const { addStockMovement } = useStockMovement();

  const [soNumberInput, setSoNumberInput] = useState("");
  const [selectedSO, setSelectedSO] = useState<OrderItem | null>(null);
  const [fulfilledItems, setFulfilledItems] = useState<FulfilledItemDisplay[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // Reset state when component mounts or SO input changes
    setSelectedSO(null);
    setFulfilledItems([]);
  }, [soNumberInput]);

  useEffect(() => {
    if (scannedDataFromGlobal && !isScanning) {
      handleScannedBarcode(scannedDataFromGlobal);
      onScannedDataProcessed(); // Acknowledge that the scanned data has been processed
    }
  }, [scannedDataFromGlobal, isScanning, onScannedDataProcessed]);

  const handleSoNumberSubmit = async () => {
    if (!soNumberInput.trim()) {
      showError("Please enter a Sales Order Number.");
      return;
    }

    await fetchOrders();

    const foundSO = orders.find(
      (order) => order.id.toLowerCase() === soNumberInput.trim().toLowerCase() && order.type === "Sales"
    );

    if (foundSO) {
      setSelectedSO(foundSO);
      const itemsWithDetails: FulfilledItemDisplay[] = foundSO.items.map((soItem) => {
        const inventoryItem = inventoryItems.find(inv => inv.id === soItem.inventoryItemId);
        return {
          ...soItem,
          fulfilledQuantity: 0, // Initialize fulfilled quantity to 0
          inventoryItemDetails: inventoryItem,
        };
      });
      setFulfilledItems(itemsWithDetails);
      showSuccess(`Sales Order ${foundSO.id} loaded.`);
    } else {
      showError(`Sales Order "${soNumberInput.trim()}" not found or is not a Sales Order.`);
      setSelectedSO(null);
      setFulfilledItems([]);
    }
  };

  const handleFulfilledQuantityChange = (itemId: number, quantity: string) => {
    setFulfilledItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, fulfilledQuantity: parseInt(quantity) || 0 } : item
      )
    );
  };

  const handleScannedBarcode = (scannedData: string) => {
    setIsScanning(false); // Scanning is complete
    if (!selectedSO) {
      showError("Please load a Sales Order before scanning items.");
      return;
    }

    const lowerCaseScannedData = scannedData.toLowerCase();
    const itemToFulfill = fulfilledItems.find(item => 
      item.inventoryItemDetails?.sku.toLowerCase() === lowerCaseScannedData ||
      item.inventoryItemDetails?.barcodeUrl?.toLowerCase().includes(lowerCaseScannedData)
    );

    if (itemToFulfill) {
      if (itemToFulfill.fulfilledQuantity < itemToFulfill.quantity) {
        setFulfilledItems(prev => prev.map(item =>
          item.id === itemToFulfill.id ? { ...item, fulfilledQuantity: item.fulfilledQuantity + 1 } : item
        ));
        showSuccess(`Scanned: ${itemToFulfill.itemName}. Fulfilled count increased.`);
      } else {
        showError(`${itemToFulfill.itemName} already fully fulfilled for this order.`);
      }
    } else {
      showError(`Scanned item (SKU/Barcode: ${scannedData}) not found in this order.`);
    }
  };

  const handleScanItem = () => {
    setIsScanning(true);
    onScanRequest(handleScannedBarcode);
  };

  const handleCompleteOrder = async () => {
    if (!selectedSO) {
      showError("No Sales Order selected to complete fulfillment.");
      return;
    }

    let allItemsFulfilled = true;
    let updatesSuccessful = true;

    for (const item of fulfilledItems) {
      if (item.fulfilledQuantity > 0) {
        const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryItemId);
        if (inventoryItem) {
          if (inventoryItem.quantity < item.fulfilledQuantity) {
            showError(`Not enough stock for ${inventoryItem.name}. Available: ${inventoryItem.quantity}`);
            updatesSuccessful = false;
            break;
          }
          const oldQuantity = inventoryItem.quantity;
          const newQuantity = oldQuantity - item.fulfilledQuantity;
          const updatedInventoryItem = {
            ...inventoryItem,
            quantity: newQuantity,
            committedStock: Math.max(0, inventoryItem.committedStock - item.fulfilledQuantity),
            lastUpdated: new Date().toISOString().split('T')[0],
          };
          await updateInventoryItem(updatedInventoryItem);
          await addStockMovement({
            itemId: inventoryItem.id,
            itemName: inventoryItem.name,
            type: "subtract",
            amount: item.fulfilledQuantity,
            oldQuantity: oldQuantity,
            newQuantity: newQuantity,
            reason: `Fulfilled for SO ${selectedSO.id} (Mobile)`,
          });
        } else {
          showError(`Inventory item for ${item.itemName} not found.`);
          updatesSuccessful = false;
        }
      }
      if (item.fulfilledQuantity < item.quantity) {
        allItemsFulfilled = false;
      }
    }

    if (updatesSuccessful) {
      const newStatus = allItemsFulfilled ? "Packed" : "Processing"; // If partially fulfilled, keep as processing
      const updatedSO = { ...selectedSO, status: newStatus as OrderItem['status'] };
      await updateOrder(updatedSO);
      showSuccess(`Fulfillment for SO ${selectedSO.id} completed. Status updated to "${newStatus}".`);
      refreshInventory();
      setSoNumberInput("");
      setSelectedSO(null);
      setFulfilledItems([]);
    } else {
      showError("Some items could not be updated. Please check the console for details.");
    }
  };

  const isCompleteButtonDisabled = !selectedSO || fulfilledItems.every(item => item.fulfilledQuantity === 0);

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-xl font-bold text-center">Fulfill Order</h2>

      <div className="space-y-4">
        <Label htmlFor="soNumber" className="text-lg font-semibold">Sales Order Number</Label>
        <div className="flex gap-2">
          <Input
            id="soNumber"
            placeholder="Enter SO Number"
            value={soNumberInput}
            onChange={(e) => setSoNumberInput(e.target.value)}
            className="flex-grow"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSoNumberSubmit();
              }
            }}
          />
          <Button onClick={handleSoNumberSubmit} disabled={!soNumberInput.trim()}>Load SO</Button>
        </div>
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3 flex items-center justify-center gap-2"
          onClick={handleScanItem}
          disabled={isScanning || !selectedSO}
        >
          <Barcode className="h-6 w-6" />
          {isScanning ? "Scanning..." : "Scan Item"}
        </Button>
      </div>

      <div className="flex-grow space-y-4 overflow-hidden">
        {selectedSO ? (
          <>
            <h3 className="text-lg font-semibold">Items for SO: {selectedSO.id}</h3>
            <ScrollArea className="h-full max-h-[calc(100vh-400px)]">
              <div className="space-y-3 pr-2">
                {fulfilledItems.map((item) => (
                  <Card key={item.id} className="bg-card border-border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-lg">{item.itemName}</h4>
                        <span className="text-sm text-muted-foreground">SKU: {item.inventoryItemDetails?.sku}</span>
                      </div>
                      <p className="text-muted-foreground text-sm mb-2 flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> Location: {item.inventoryItemDetails?.location || "N/A"}
                      </p>
                      <div className="flex justify-between items-center">
                        <p className="text-muted-foreground text-sm">Required: {item.quantity}</p>
                        <Input
                          type="number"
                          value={item.fulfilledQuantity === 0 ? "" : item.fulfilledQuantity}
                          onChange={(e) => handleFulfilledQuantityChange(item.id, e.target.value)}
                          className="w-24 text-right"
                          min="0"
                          max={item.quantity}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
            <ShoppingCart className="h-12 w-12 mb-4" />
            <p className="text-lg">Enter a Sales Order number to begin fulfillment.</p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3 flex items-center justify-center gap-2"
          onClick={handleCompleteOrder}
          disabled={isCompleteButtonDisabled}
        >
          <CheckCircle className="h-6 w-6" /> Complete Order
        </Button>
      </div>
    </div>
  );
};

export default FulfillOrderTool;