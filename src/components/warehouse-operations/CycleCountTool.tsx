import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Package, MapPin, Barcode } from "lucide-react";
import { useInventory } from "@/context/InventoryContext";
import { useOnboarding } from "@/context/OnboardingContext"; // Now contains Location[]
import { useStockMovement } from "@/context/StockMovementContext";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabaseClient"; // Import supabase

interface CountedItem {
  id: string;
  name: string;
  sku: string;
  systemPickingBinQuantity: number; // Track system quantity for picking bin
  systemOverstockQuantity: number; // Track system quantity for overstock
  countedPickingBinQuantity: number; // User input for picking bin
  countedOverstockQuantity: number; // User input for overstock
  location: string; // Main location (fullLocationString)
  pickingBinLocation: string; // Specific picking bin location (fullLocationString)
  isScanned: boolean;
  barcodeUrl?: string;
}

interface CycleCountToolProps {
  onScanRequest: (callback: (scannedData: string) => void) => void;
  scannedDataFromGlobal?: string | null;
  onScannedDataProcessed: () => void;
}

const CycleCountTool: React.FC<CycleCountToolProps> = ({ onScanRequest, scannedDataFromGlobal, onScannedDataProcessed }) => {
  const { inventoryItems, refreshInventory } = useInventory();
  const { locations } = useOnboarding(); // Now contains Location[]
  // Removed useStockMovement as updates will go through Edge Function

  const [selectedLocation, setSelectedLocation] = useState("all"); // This will be fullLocationString or "all"
  const [itemsToCount, setItemsToCount] = useState<CountedItem[]>([]);
  const [isCounting, setIsCounting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const filteredInventory = useMemo(() => {
    if (selectedLocation === "all") return inventoryItems;
    return inventoryItems.filter(item => item.location === selectedLocation || item.pickingBinLocation === selectedLocation);
  }, [inventoryItems, selectedLocation]);

  useEffect(() => {
    if (!isCounting) {
      setItemsToCount([]);
    }
  }, [isCounting]);

  useEffect(() => {
    if (scannedDataFromGlobal && !isScanning && isCounting) {
      handleScannedBarcode(scannedDataFromGlobal);
      onScannedDataProcessed();
    }
  }, [scannedDataFromGlobal, isScanning, isCounting, onScannedDataProcessed]);

  const startCycleCount = () => {
    if (filteredInventory.length === 0) {
      showError("No items found for the selected location to start a cycle count.");
      return;
    }
    const initialItems: CountedItem[] = filteredInventory.map(item => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      systemPickingBinQuantity: item.pickingBinQuantity,
      systemOverstockQuantity: item.overstockQuantity,
      countedPickingBinQuantity: 0,
      countedOverstockQuantity: 0,
      location: item.location,
      pickingBinLocation: item.pickingBinLocation,
      isScanned: false,
      barcodeUrl: item.barcodeUrl,
    }));
    setItemsToCount(initialItems);
    setIsCounting(true);
    showSuccess(`Cycle count started for ${selectedLocation === "all" ? "all locations" : locations.find(loc => loc.fullLocationString === selectedLocation)?.displayName || selectedLocation}.`);
  };

  const handleCountedQuantityChange = (itemId: string, locationType: 'pickingBin' | 'overstock', quantity: string) => {
    setItemsToCount(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const parsedQuantity = parseInt(quantity) || 0;
          if (locationType === 'pickingBin') {
            return { ...item, countedPickingBinQuantity: parsedQuantity };
          } else {
            return { ...item, countedOverstockQuantity: parsedQuantity };
          }
        }
        return item;
      })
    );
  };

  const handleScannedBarcode = (scannedData: string) => {
    setIsScanning(false);
    if (!isCounting) {
      showError("Please start a cycle count before scanning items.");
      return;
    }

    const lowerCaseScannedData = scannedData.toLowerCase();
    const scannedItem = itemsToCount.find(
      item => item.sku.toLowerCase() === lowerCaseScannedData ||
               (item.barcodeUrl && item.barcodeUrl.toLowerCase().includes(lowerCaseScannedData))
    );

    if (scannedItem) {
      // For simplicity, increment picking bin quantity on scan
      setItemsToCount(prev =>
        prev.map(item =>
          item.id === scannedItem.id ? { ...item, isScanned: true, countedPickingBinQuantity: item.countedPickingBinQuantity + 1 } : item
        )
      );
      showSuccess(`Scanned: ${scannedItem.name}. Picking bin count increased.`);
    } else {
      showError(`Item with SKU/Barcode "${scannedData}" not found in this count.`);
    }
  };

  const handleScanClick = () => {
    setIsScanning(true);
    onScanRequest(handleScannedBarcode);
  };

  const completeCycleCount = async () => {
    let discrepanciesFound = 0;
    let updatesSuccessful = 0;

    for (const item of itemsToCount) {
      const originalItem = inventoryItems.find(inv => inv.id === item.id);
      if (!originalItem) {
        console.warn(`Original inventory item ${item.id} not found during cycle count completion.`);
        continue;
      }

      // Check picking bin discrepancy
      if (item.systemPickingBinQuantity !== item.countedPickingBinQuantity) {
        discrepanciesFound++;
        try {
          const { data, error } = await supabase.functions.invoke('handle-stock-discrepancy', {
            body: JSON.stringify({
              item_id: item.id,
              location_string: item.pickingBinLocation,
              location_type: 'picking_bin',
              physical_count: item.countedPickingBinQuantity,
              reason: 'Cycle Count Adjustment',
            }),
          });

          if (error) throw error;
          if (data.error) throw new Error(data.error);

          updatesSuccessful++;
          console.log(`Discrepancy for ${item.name} (picking bin) processed:`, data);
        } catch (error: any) {
          console.error(`Failed to process picking bin discrepancy for ${item.name}:`, error);
          showError(`Failed to process picking bin discrepancy for ${item.name}: ${error.message}`);
        }
      }

      // Check overstock discrepancy
      if (item.systemOverstockQuantity !== item.countedOverstockQuantity) {
        discrepanciesFound++;
        try {
          const { data, error } = await supabase.functions.invoke('handle-stock-discrepancy', {
            body: JSON.stringify({
              item_id: item.id,
              location_string: item.location, // Assuming main location for overstock
              location_type: 'overstock',
              physical_count: item.countedOverstockQuantity,
              reason: 'Cycle Count Adjustment',
            }),
          });

          if (error) throw error;
          if (data.error) throw new Error(data.error);

          updatesSuccessful++;
          console.log(`Discrepancy for ${item.name} (overstock) processed:`, data);
        } catch (error: any) {
          console.error(`Failed to process overstock discrepancy for ${item.name}:`, error);
          showError(`Failed to process overstock discrepancy for ${item.name}: ${error.message}`);
        }
      }
    }

    if (discrepanciesFound > 0) {
      showSuccess(`Cycle count completed. ${updatesSuccessful} discrepancies processed.`);
    } else {
      showSuccess("Cycle count completed. No discrepancies found.");
    }
    
    refreshInventory(); // Refresh inventory to reflect changes
    setIsCounting(false);
    setItemsToCount([]);
    setSelectedLocation("all");
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-xl font-bold text-center">Cycle Counting</h2>

      {!isCounting ? (
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" /> Select Location
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="locationSelect" className="font-semibold">Location to Count</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger id="locationSelect">
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.fullLocationString}>
                      {loc.displayName || loc.fullLocationString}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={startCycleCount} className="w-full" disabled={filteredInventory.length === 0}>
              Start Cycle Count
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3 flex items-center justify-center gap-2"
            onClick={handleScanClick}
            disabled={isScanning}
          >
            <Barcode className="h-6 w-6" />
            {isScanning ? "Scanning..." : "Scan Item"}
          </Button>

          <ScrollArea className="flex-grow pb-4">
            <div className="space-y-3">
              {itemsToCount.map(item => (
                <Card key={item.id} className="bg-card border-border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <span className="text-sm text-muted-foreground">SKU: {item.sku}</span>
                    </div>
                    <p className="text-muted-foreground text-sm mb-2">Main Location: {locations.find(loc => loc.fullLocationString === item.location)?.displayName || item.location}</p>
                    
                    {/* Picking Bin Quantity */}
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor={`counted-picking-qty-${item.id}`} className="font-semibold">
                        Picking Bin ({locations.find(loc => loc.fullLocationString === item.pickingBinLocation)?.displayName || item.pickingBinLocation}):
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">System: {item.systemPickingBinQuantity}</span>
                        <Input
                          id={`counted-picking-qty-${item.id}`}
                          type="number"
                          value={item.countedPickingBinQuantity === 0 ? "" : item.countedPickingBinQuantity}
                          onChange={(e) => handleCountedQuantityChange(item.id, 'pickingBin', e.target.value)}
                          className="w-24 text-right"
                          min="0"
                        />
                      </div>
                    </div>
                    {item.systemPickingBinQuantity !== item.countedPickingBinQuantity && item.countedPickingBinQuantity !== 0 && (
                      <p className="text-sm text-destructive mt-1">
                        Discrepancy: {Math.abs(item.systemPickingBinQuantity - item.countedPickingBinQuantity)} units in Picking Bin
                      </p>
                    )}

                    {/* Overstock Quantity */}
                    <div className="flex items-center justify-between mt-3">
                      <Label htmlFor={`counted-overstock-qty-${item.id}`} className="font-semibold">
                        Overstock:
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">System: {item.systemOverstockQuantity}</span>
                        <Input
                          id={`counted-overstock-qty-${item.id}`}
                          type="number"
                          value={item.countedOverstockQuantity === 0 ? "" : item.countedOverstockQuantity}
                          onChange={(e) => handleCountedQuantityChange(item.id, 'overstock', e.target.value)}
                          className="w-24 text-right"
                          min="0"
                        />
                      </div>
                    </div>
                    {item.systemOverstockQuantity !== item.countedOverstockQuantity && item.countedOverstockQuantity !== 0 && (
                      <p className="text-sm text-destructive mt-1">
                        Discrepancy: {Math.abs(item.systemOverstockQuantity - item.countedOverstockQuantity)} units in Overstock
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          <div className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => setIsCounting(false)} className="flex-grow">
              Cancel Count
            </Button>
            <Button onClick={completeCycleCount} className="flex-grow">
              Complete Count
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default CycleCountTool;