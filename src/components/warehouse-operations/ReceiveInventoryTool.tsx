"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Barcode, CheckCircle, Package, MapPin, Printer } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showSuccess, showError } from "@/utils/toast";
import { useOrders, OrderItem, POItem } from "@/context/OrdersContext";
import { useInventory, InventoryItem } from "@/context/InventoryContext";
import { useStockMovement } from "@/context/StockMovementContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { usePrint } from "@/context/PrintContext";
import { generateQrCodeSvg } from "@/utils/qrCodeGenerator";
import { format } from "date-fns";

interface ReceivedItemDisplay extends POItem {
  receivedQuantity: number;
  inventoryItemDetails?: InventoryItem;
  suggestedPutawayLocation?: string; // fullLocationString
  lotNumber?: string;
  expirationDate?: string;
  serialNumber?: string; // Added for future use
}

interface ReceiveInventoryToolProps {
  onScanRequest: (callback: (scannedData: string) => void) => void;
  scannedDataFromGlobal?: string | null;
  onScannedDataProcessed: () => void;
}

const ReceiveInventoryTool: React.FC<ReceiveInventoryToolProps> = ({ onScanRequest, scannedDataFromGlobal, onScannedDataProcessed }) => {
  const { orders, fetchOrders, updateOrder } = useOrders();
  const { inventoryItems, refreshInventory, updateInventoryItem } = useInventory();
  const { addStockMovement } = useStockMovement();
  const { locations } = useOnboarding(); // Now contains Location[]
  const { initiatePrint } = usePrint();

  const [poNumberInput, setPoNumberInput] = useState("");
  const [selectedPO, setSelectedPO] = useState<OrderItem | null>(null);
  const [receivedItems, setReceivedItems] = useState<ReceivedItemDisplay[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const availableLocations = useMemo(() => locations.filter(loc => loc.fullLocationString !== "RETURNS-AREA-01-1-A"), [locations]);

  useEffect(() => {
    setSelectedPO(null);
    setReceivedItems([]);
  }, [poNumberInput]);

  useEffect(() => {
    if (scannedDataFromGlobal) {
      if (!selectedPO) {
        setPoNumberInput(scannedDataFromGlobal);
        handlePoNumberSubmit(scannedDataFromGlobal);
      } else {
        handleScannedBarcode(scannedDataFromGlobal);
      }
      onScannedDataProcessed();
    }
  }, [scannedDataFromGlobal, selectedPO, onScannedDataProcessed]);

  const getSuggestedPutawayLocation = (itemCategory: string): string => {
    if (availableLocations.length === 0) return "Unassigned";

    // Find location objects by display name or full string
    const mainWarehouse = availableLocations.find(loc => loc.displayName === "Main Warehouse" || loc.fullLocationString === "MAIN-WAREHOUSE-01-01-1-A");
    const coldStorage = availableLocations.find(loc => loc.displayName === "Cold Storage" || loc.fullLocationString === "COLD-STORAGE-01-01-1-A");
    const storeFront = availableLocations.find(loc => loc.displayName === "Store Front" || loc.fullLocationString === "STORE-FRONT-01-01-1-A");

    if (itemCategory === "Electronics" && mainWarehouse) return mainWarehouse.fullLocationString;
    if (itemCategory === "Office Supplies" && storeFront) return storeFront.fullLocationString;
    if (itemCategory === "Perishables" && coldStorage) return coldStorage.fullLocationString;

    // Fallback to a random available location's fullLocationString
    return availableLocations[Math.floor(Math.random() * availableLocations.length)].fullLocationString;
  };

  const handlePoNumberSubmit = async (poNum?: string) => {
    const currentPoNum = poNum || poNumberInput.trim();
    if (!currentPoNum) {
      showError("Please enter a Purchase Order Number.");
      return;
    }

    await fetchOrders();

    const foundPO = orders.find(
      (order) => order.id.toLowerCase() === currentPoNum.toLowerCase() && order.type === "Purchase"
    );

    if (foundPO) {
      setSelectedPO(foundPO);
      const itemsWithDetails: ReceivedItemDisplay[] = foundPO.items.map((poItem) => {
        const inventoryItem = inventoryItems.find(inv => inv.id === poItem.inventoryItemId);
        return {
          ...poItem,
          receivedQuantity: 0,
          inventoryItemDetails: inventoryItem,
          suggestedPutawayLocation: inventoryItem ? getSuggestedPutawayLocation(inventoryItem.category) : "Unassigned",
          lotNumber: undefined,
          expirationDate: undefined,
          serialNumber: undefined,
        };
      });
      setReceivedItems(itemsWithDetails);
      showSuccess(`Purchase Order ${foundPO.id} loaded.`);
    } else {
      showError(`Purchase Order "${currentPoNum}" not found or is not a Purchase Order.`);
      setSelectedPO(null);
      setReceivedItems([]);
    }
  };

  const handleReceivedQuantityChange = (itemId: number, quantity: string) => {
    setReceivedItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, receivedQuantity: parseInt(quantity || '0') } : item
      )
    );
  };

  const handleLotNumberChange = (itemId: number, lot: string) => {
    setReceivedItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, lotNumber: lot } : item
      )
    );
  };

  const handleExpirationDateChange = (itemId: number, date: string) => {
    setReceivedItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, expirationDate: date } : item
      )
    );
  };

  const handleScannedBarcode = (scannedData: string) => {
    setIsScanning(false);
    if (!selectedPO) {
      showError("Please load a Purchase Order before scanning items.");
      return;
    }

    const lowerCaseScannedData = scannedData.toLowerCase();
    const itemToReceive = receivedItems.find(item =>
      item.inventoryItemDetails?.sku.toLowerCase() === lowerCaseScannedData ||
      (item.inventoryItemDetails?.barcodeUrl && item.inventoryItemDetails.barcodeUrl.toLowerCase() === lowerCaseScannedData) // Match against raw barcodeUrl
    );

    if (itemToReceive) {
      if (itemToReceive.receivedQuantity < itemToReceive.quantity) {
        setReceivedItems(prev => prev.map(item =>
          item.id === itemToReceive.id ? { ...item, receivedQuantity: item.receivedQuantity + 1 } : item
        ));
        showSuccess(`Scanned: ${itemToReceive.itemName}. Received count increased.`);
      } else {
        showError(`${itemToReceive.itemName} already fully received for this PO.`);
      }
    } else {
      showError(`Scanned item (SKU/Barcode: ${scannedData}) not found in this Purchase Order.`);
    }
  };

  const handleScanClick = () => {
    setIsScanning(true);
    onScanRequest(handleScannedBarcode);
  };

  const handlePrintPutawayLabel = async (item: ReceivedItemDisplay) => {
    if (!item.inventoryItemDetails || !item.suggestedPutawayLocation) {
      showError("Cannot print label: Missing item details or putaway location.");
      return;
    }

    try {
      const qrCodeValue = JSON.stringify({
        sku: item.inventoryItemDetails.sku,
        qty: item.receivedQuantity,
        loc: item.suggestedPutawayLocation,
        lot: item.lotNumber,
        exp: item.expirationDate,
        sn: item.serialNumber,
      });
      const qrCodeSvg = await generateQrCodeSvg(qrCodeValue, 128);

      const labelProps = {
        itemName: item.itemName,
        itemSku: item.inventoryItemDetails.sku,
        receivedQuantity: item.receivedQuantity,
        suggestedLocation: item.suggestedPutawayLocation,
        lotNumber: item.lotNumber,
        expirationDate: item.expirationDate,
        serialNumber: item.serialNumber,
        qrCodeSvg: qrCodeSvg,
        printDate: format(new Date(), "MMM dd, yyyy HH:mm"),
      };

      initiatePrint({ type: "putaway-label", props: labelProps });
      showSuccess(`Putaway label for ${item.itemName} sent to printer.`);
    } catch (error: any) {
      showError(`Failed to generate/print label: ${error.message}`);
    }
  };

  const handleCompleteReceive = async () => {
    if (!selectedPO) {
      showError("No Purchase Order selected to complete receiving.");
      return;
    }

    let allItemsReceived = true;
    let updatesSuccessful = true;

    for (const item of receivedItems) {
      if (item.receivedQuantity > 0) {
        const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryItemId);
        if (inventoryItem) {
          const oldQuantity = inventoryItem.quantity;
          const newQuantity = oldQuantity + item.receivedQuantity;
          const updatedInventoryItem = {
            ...inventoryItem,
            quantity: newQuantity,
            incomingStock: Math.max(0, inventoryItem.incomingStock - item.receivedQuantity),
            lastUpdated: new Date().toISOString().split('T')[0],
          };
          await updateInventoryItem(updatedInventoryItem);
          await addStockMovement({
            itemId: inventoryItem.id,
            itemName: inventoryItem.name,
            type: "add",
            amount: item.receivedQuantity,
            oldQuantity: oldQuantity,
            newQuantity: newQuantity,
            reason: `Received from PO ${selectedPO.id} (Mobile)`,
          });
        } else {
          showError(`Inventory item for ${item.itemName} not found.`);
          updatesSuccessful = false;
        }
      }
      if (item.receivedQuantity < item.quantity) {
        allItemsReceived = false;
      }
    }

    if (updatesSuccessful) {
      // Update PO status (e.g., to 'Shipped' or 'Partially Received')
      const updatedPO = {
        ...selectedPO,
        status: "Shipped" as OrderItem['status'],
        putawayStatus: "Pending", // NEW: Mark PO as pending putaway
        notes: selectedPO.notes
      }; // Explicitly cast status
      await updateOrder(updatedPO);
      showSuccess(`Shipment for PO ${selectedPO.id} received successfully! Inventory updated and ready for putaway.`);
      refreshInventory(); // Ensure inventory context is refreshed
      setPoNumberInput("");
      setSelectedPO(null);
      setReceivedItems([]);
    } else {
      showError("Some items could not be updated. Check console for details.");
    }
  };

  const isCompleteButtonDisabled = !selectedPO || receivedItems.every(item => item.receivedQuantity === 0);

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-xl font-bold text-center">Receive Inventory</h2>

      <div className="space-y-4">
        <Label htmlFor="poNumber" className="text-lg font-semibold">Purchase Order Number</Label>
        <div className="flex gap-2">
          <Input
            id="poNumber"
            placeholder="Enter PO Number"
            value={poNumberInput}
            onChange={(e) => setPoNumberInput(e.target.value)}
            className="flex-grow"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handlePoNumberSubmit();
              }
            }}
          />
          <Button onClick={() => handlePoNumberSubmit()} disabled={!poNumberInput.trim()}>Load PO</Button>
        </div>
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3 flex items-center justify-center gap-2"
          onClick={handleScanClick}
          disabled={isScanning || !selectedPO}
        >
          <Barcode className="h-6 w-6" />
          {isScanning ? "Scanning..." : "Scan Item Barcode"}
        </Button>
      </div>

      <div className="flex-grow space-y-4 overflow-hidden">
        {selectedPO ? (
          <>
            <h3 className="text-lg font-semibold">Items for PO: {selectedPO.id}</h3>
            <ScrollArea className="h-full">
              <div className="space-y-3 pr-2">
                {receivedItems.map((item) => (
                  <Card key={item.id} className="bg-card border-border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2 flex-wrap gap-y-1">
                        <h4 className="font-semibold text-lg">{item.itemName}</h4>
                        <span className="text-sm text-muted-foreground">SKU: {item.inventoryItemDetails?.sku}</span>
                      </div>
                      <p className="text-muted-foreground text-sm mb-2 flex items-center gap-1">
                        <Package className="h-4 w-4" /> Expected: {item.quantity}
                      </p>
                      <div className="flex justify-between items-center mb-2 flex-wrap gap-y-1">
                        <Label htmlFor={`received-qty-${item.id}`} className="font-semibold">Received Qty:</Label>
                        <Input
                          id={`received-qty-${item.id}`}
                          type="number"
                          value={item.receivedQuantity === 0 ? "" : item.receivedQuantity}
                          onChange={(e) => handleReceivedQuantityChange(item.id, e.target.value)}
                          placeholder="Qty"
                          min="0"
                          className="w-24 text-right"
                        />
                      </div>
                      <div className="space-y-2 mb-2">
                        <Label htmlFor={`lot-number-${item.id}`} className="font-semibold">Lot Number (Optional)</Label>
                        <Input
                          id={`lot-number-${item.id}`}
                          value={item.lotNumber || ""}
                          onChange={(e) => handleLotNumberChange(item.id, e.target.value)}
                          placeholder="e.g., L12345"
                        />
                      </div>
                      <div className="space-y-2 mb-2">
                        <Label htmlFor={`exp-date-${item.id}`} className="font-semibold">Expiration Date (Optional)</Label>
                        <Input
                          id={`exp-date-${item.id}`}
                          type="date"
                          value={item.expirationDate || ""}
                          onChange={(e) => handleExpirationDateChange(item.id, e.target.value)}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2 flex-wrap gap-y-1">
                        <p className="text-muted-foreground text-sm flex items-center gap-1 flex-grow min-w-0 truncate">
                          <MapPin className="h-4 w-4 flex-shrink-0" /> Putaway: <span className="font-semibold text-primary flex-shrink-0">{structuredLocations.find(loc => loc.fullLocationString === item.suggestedPutawayLocation)?.displayName || item.suggestedPutawayLocation}</span>
                        </p>
                        {item.receivedQuantity > 0 && (
                          <Button variant="outline" size="sm" onClick={() => handlePrintPutawayLabel(item)} className="flex-shrink-0">
                            <Printer className="h-4 w-4 mr-2" /> Print Label
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
            <Package className="h-12 w-12 mb-4" />
            <p className="text-lg">Enter a PO number to begin receiving.</p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3 flex items-center justify-center gap-2"
          onClick={handleCompleteReceive}
          disabled={isCompleteButtonDisabled}
        >
          <CheckCircle className="h-6 w-6" /> Complete Receive
        </Button>
      </div>
    </div>
  );
};

export default ReceiveInventoryTool;