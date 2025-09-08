"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Barcode, CheckCircle, Package, MapPin, ListOrdered, Scan } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showSuccess, showError } from "@/utils/toast";
import { useOrders, OrderItem, POItem } from "@/context/OrdersContext";
import { useInventory, InventoryItem } from "@/context/InventoryContext";
import { useStockMovement } from "@/context/StockMovementContext";
import { useOnboarding } from "@/context/OnboardingContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PutawayItemDisplay extends POItem {
  inventoryItemDetails?: InventoryItem;
  suggestedPutawayLocation: string; // fullLocationString
  isPutAway: boolean;
}

interface PutawayToolProps {
  onScanRequest: (callback: (scannedData: string) => void) => void;
  scannedDataFromGlobal?: string | null;
  onScannedDataProcessed: () => void;
}

const PutawayTool: React.FC<PutawayToolProps> = ({ onScanRequest, scannedDataFromGlobal, onScannedDataProcessed }) => {
  const { orders, fetchOrders, updateOrder } = useOrders();
  const { inventoryItems, refreshInventory, updateInventoryItem } = useInventory();
  const { addStockMovement } = useStockMovement();
  const { locations: structuredLocations } = useOnboarding();

  const [poNumberInput, setPoNumberInput] = useState("");
  const [selectedPO, setSelectedPO] = useState<OrderItem | null>(null);
  const [itemsToPutAway, setItemsToPutAway] = useState<PutawayItemDisplay[]>([]);
  const [scannedLocation, setScannedLocation] = useState<string | null>(null); // Stores the fullLocationString of the scanned location
  const [isScanning, setIsScanning] = useState(false);
  const [currentScanMode, setCurrentScanMode] = useState<"po" | "location" | "item">("po");

  const receivedPOs = useMemo(() => {
    return orders.filter(order => order.type === "Purchase" && order.putawayStatus === "Pending");
  }, [orders]);

  useEffect(() => {
    // Reset state when component mounts or PO input changes
    setSelectedPO(null);
    setItemsToPutAway([]);
    setScannedLocation(null);
    setCurrentScanMode("po");
  }, [poNumberInput]);

  useEffect(() => {
    if (scannedDataFromGlobal) {
      handleScannedData(scannedDataFromGlobal);
      onScannedDataProcessed();
    }
  }, [scannedDataFromGlobal, onScannedDataProcessed]);

  const handleScannedData = (scannedData: string) => {
    setIsScanning(false);
    const lowerCaseScannedData = scannedData.toLowerCase();

    if (currentScanMode === "po") {
      const foundPO = receivedPOs.find(po => po.id.toLowerCase() === lowerCaseScannedData);
      if (foundPO) {
        handlePoSelect(foundPO.id);
        showSuccess(`PO ${foundPO.id} loaded. Now scan a location.`);
        setCurrentScanMode("location");
      } else {
        showError(`Purchase Order "${scannedData}" not found or not ready for putaway.`);
      }
    } else if (currentScanMode === "location") {
      const foundLocation = structuredLocations.find(loc => loc.fullLocationString.toLowerCase() === lowerCaseScannedData);
      if (foundLocation) {
        setScannedLocation(foundLocation.fullLocationString);
        showSuccess(`Location ${foundLocation.displayName || foundLocation.fullLocationString} scanned. Now scan an item.`);
        setCurrentScanMode("item");
      } else {
        showError(`Location "${scannedData}" not recognized.`);
      }
    } else if (currentScanMode === "item") {
      if (!selectedPO || !scannedLocation) {
        showError("Please load a PO and scan a location first.");
        return;
      }

      const itemToPutAway = itemsToPutAway.find(item =>
        !item.isPutAway && (
          item.inventoryItemDetails?.sku.toLowerCase() === lowerCaseScannedData ||
          (item.inventoryItemDetails?.barcodeUrl && item.inventoryItemDetails.barcodeUrl.toLowerCase().includes(lowerCaseScannedData))
        )
      );

      if (itemToPutAway) {
        // Check if the scanned location matches the suggested location for this item
        if (itemToPutAway.suggestedPutawayLocation === scannedLocation) {
          confirmPutaway(itemToPutAway);
        } else {
          // Allow override, but warn
          showError(`Scanned item ${itemToPutAway.itemName} is suggested for ${getLocationDisplayName(itemToPutAway.suggestedPutawayLocation)}, but scanned location is ${getLocationDisplayName(scannedLocation)}. Confirm to override.`);
          // For now, we'll just confirm, but a real system might ask for explicit confirmation
          confirmPutaway(itemToPutAway);
        }
      } else {
        showError(`Scanned item (SKU/Barcode: ${scannedData}) not found in this PO or already put away.`);
      }
    }
  };

  const handleScanClick = (mode: "po" | "location" | "item") => {
    setIsScanning(true);
    setCurrentScanMode(mode);
    onScanRequest(handleScannedData);
  };

  const handlePoSelect = async (orderId: string) => {
    const foundPO = orders.find(
      (order) => order.id === orderId && order.type === "Purchase" && order.putawayStatus === "Pending"
    );

    if (foundPO) {
      setSelectedPO(foundPO);
      const itemsWithDetails: PutawayItemDisplay[] = foundPO.items.map((poItem) => {
        const inventoryItem = inventoryItems.find(inv => inv.id === poItem.inventoryItemId);
        return {
          ...poItem,
          inventoryItemDetails: inventoryItem,
          suggestedPutawayLocation: inventoryItem?.location || "Unassigned", // Use item's current location as suggested
          isPutAway: false,
        };
      });
      setItemsToPutAway(itemsWithDetails);
      showSuccess(`Purchase Order ${foundPO.id} loaded. Ready for putaway.`);
      setCurrentScanMode("location"); // Next step is to scan location
    } else {
      showError(`Purchase Order "${orderId}" not found or not ready for putaway.`);
      setSelectedPO(null);
      setItemsToPutAway([]);
      setCurrentScanMode("po");
    }
  };

  const confirmPutaway = async (itemToPutAway: PutawayItemDisplay) => {
    if (!selectedPO || !scannedLocation || !itemToPutAway.inventoryItemDetails) {
      showError("Missing data for putaway confirmation.");
      return;
    }

    const inventoryItem = itemToPutAway.inventoryItemDetails;
    const oldLocation = inventoryItem.location;
    const newLocation = scannedLocation;

    // Update inventory item's location
    const updatedInventoryItem = {
      ...inventoryItem,
      location: newLocation,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    await updateInventoryItem(updatedInventoryItem);

    // Log stock movement
    await addStockMovement({
      itemId: inventoryItem.id,
      itemName: inventoryItem.name,
      type: "add", // Conceptually, it's being added to a new specific location
      amount: itemToPutAway.quantity,
      oldQuantity: inventoryItem.quantity, // Total quantity before this putaway
      newQuantity: inventoryItem.quantity, // Total quantity remains same, only location changes
      reason: `Putaway from PO ${selectedPO.id} to ${newLocation}`,
    });

    setItemsToPutAway(prev => prev.map(item =>
      item.id === itemToPutAway.id ? { ...item, isPutAway: true } : item
    ));
    showSuccess(`Put away ${itemToPutAway.itemName} to ${getLocationDisplayName(newLocation)}.`);

    // Check if all items from the PO are put away
    const allItemsPutAway = itemsToPutAway.every(item => item.isPutAway || item.id === itemToPutAway.id);
    if (allItemsPutAway) {
      await updateOrder({ ...selectedPO, putawayStatus: "Completed" });
      showSuccess(`All items from PO ${selectedPO.id} have been put away!`);
      setSelectedPO(null);
      setItemsToPutAway([]);
      setScannedLocation(null);
      setPoNumberInput("");
      setCurrentScanMode("po");
    }
    refreshInventory();
  };

  const getLocationDisplayName = (fullLocationString: string) => {
    const foundLoc = structuredLocations.find(loc => loc.fullLocationString === fullLocationString);
    return foundLoc?.displayName || fullLocationString;
  };

  const isCompleteButtonDisabled = !selectedPO || itemsToPutAway.some(item => !item.isPutAway);

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-xl font-bold text-center">Putaway Inventory</h2>

      <div className="space-y-4">
        <Label htmlFor="poSelect" className="text-lg font-semibold">Select Purchase Order</Label>
        <div className="flex gap-2">
          <Select value={selectedPO?.id || ""} onValueChange={handlePoSelect} disabled={isScanning}>
            <SelectTrigger id="poSelect">
              <SelectValue placeholder="Select a received PO" />
            </SelectTrigger>
            <SelectContent>
              {receivedPOs.length > 0 ? (
                receivedPOs.map(po => (
                  <SelectItem key={po.id} value={po.id}>
                    {po.id} - {po.customerSupplier} (Due: {po.dueDate})
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-pos" disabled>No POs ready for putaway</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Button onClick={() => handleScanClick("po")} disabled={isScanning}>
            <Scan className="h-4 w-4 mr-2" /> Scan PO
          </Button>
        </div>
      </div>

      {selectedPO && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">PO: {selectedPO.id} - {selectedPO.customerSupplier}</h3>
          <div className="flex gap-2">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3 flex items-center justify-center gap-2"
              onClick={() => handleScanClick("location")}
              disabled={isScanning}
            >
              <MapPin className="h-6 w-6" />
              {isScanning && currentScanMode === "location" ? "Scanning Location..." : "Scan Location"}
            </Button>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3 flex items-center justify-center gap-2"
              onClick={() => handleScanClick("item")}
              disabled={isScanning || !scannedLocation}
            >
              <Package className="h-6 w-6" />
              {isScanning && currentScanMode === "item" ? "Scanning Item..." : "Scan Item"}
            </Button>
          </div>
          {scannedLocation && (
            <p className="text-sm text-muted-foreground text-center">
              Current Putaway Location: <span className="font-semibold text-primary">{getLocationDisplayName(scannedLocation)}</span>
            </p>
          )}
        </div>
      )}

      <div className="flex-grow space-y-4 overflow-hidden">
        {selectedPO ? (
          <>
            <h3 className="text-lg font-semibold">Items to Put Away</h3>
            <ScrollArea className="h-full max-h-[calc(100vh-400px)]">
              <div className="space-y-3 pr-2">
                {itemsToPutAway.map((item) => (
                  <Card key={item.id} className="bg-card border-border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-lg">{item.itemName}</h4>
                        <span className="text-sm text-muted-foreground">SKU: {item.inventoryItemDetails?.sku}</span>
                      </div>
                      <p className="text-muted-foreground text-sm mb-2 flex items-center gap-1">
                        <Package className="h-4 w-4" /> Quantity: {item.quantity}
                      </p>
                      <p className="text-muted-foreground text-sm mb-2 flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> Suggested: <span className="font-semibold text-primary">{getLocationDisplayName(item.suggestedPutawayLocation)}</span>
                      </p>
                      {item.isPutAway ? (
                        <div className="flex items-center text-green-500 font-semibold mt-2">
                          <CheckCircle className="h-5 w-5 mr-2" /> Put Away!
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => confirmPutaway(item)}
                          disabled={!scannedLocation}
                        >
                          Confirm Putaway to {scannedLocation ? getLocationDisplayName(scannedLocation) : "Scanned Location"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
            <ListOrdered className="h-12 w-12 mb-4" />
            <p className="text-lg">Select a received PO to begin putaway.</p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3 flex items-center justify-center gap-2"
          onClick={() => {
            setSelectedPO(null);
            setItemsToPutAway([]);
            setScannedLocation(null);
            setPoNumberInput("");
            setCurrentScanMode("po");
            showSuccess("Putaway session cleared.");
          }}
          disabled={isCompleteButtonDisabled}
        >
          <CheckCircle className="h-6 w-6" /> Complete Putaway Session
        </Button>
      </div>
    </div>
  );
};

export default PutawayTool;