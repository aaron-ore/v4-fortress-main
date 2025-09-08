import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Undo2, Scan, Package, MapPin, AlertTriangle, CheckCircle } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { useInventory, InventoryItem } from "@/context/InventoryContext";
import { useOnboarding } from "@/context/OnboardingContext"; // Now contains Location[]
import { useStockMovement } from "@/context/StockMovementContext";

interface ReturnsProcessingToolProps {
  onScanRequest: (callback: (scannedData: string) => void) => void;
  scannedDataFromGlobal?: string | null;
  onScannedDataProcessed: () => void;
}

const ReturnsProcessingTool: React.FC<ReturnsProcessingToolProps> = ({ onScanRequest, scannedDataFromGlobal, onScannedDataProcessed }) => {
  const { inventoryItems, updateInventoryItem, refreshInventory } = useInventory();
  const { locations, addLocation } = useOnboarding(); // Use addLocation to ensure 'Returns Area' exists
  const { addStockMovement } = useStockMovement();

  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null);
  const [returnQuantity, setReturnQuantity] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returnDestination, setReturnDestination] = useState(""); // Suggested or user-selected (fullLocationString)
  const [notes, setNotes] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  const returnReasons = ["Damaged", "Customer Return (Resalable)", "Customer Return (Defective)", "Wrong Item Shipped", "Other"];

  useEffect(() => {
    // Ensure 'Returns Area' exists as a location
    const returnsAreaString = "RETURNS-AREA-01-1-A"; // Standardized string for Returns Area
    const returnsAreaDisplayName = "Returns Area";

    const existingReturnsArea = locations.find(loc => loc.fullLocationString === returnsAreaString);
    if (!existingReturnsArea) {
      addLocation({
        fullLocationString: returnsAreaString,
        displayName: returnsAreaDisplayName,
        area: "RETURNS", row: "AREA", bay: "01", level: "1", pos: "A",
        color: "#F44336", // Red for returns
      });
    }
  }, [locations, addLocation]);

  useEffect(() => {
    if (scannedDataFromGlobal && !isScanning) {
      handleScannedBarcode(scannedDataFromGlobal);
      onScannedDataProcessed();
    }
  }, [scannedDataFromGlobal, isScanning, onScannedDataProcessed]);

  const handleScannedBarcode = (scannedData: string) => {
    setIsScanning(false);
    const lowerCaseScannedData = scannedData.toLowerCase();
    const foundItem = inventoryItems.find(
      (item) =>
        item.sku.toLowerCase() === lowerCaseScannedData ||
        (item.barcodeUrl && item.barcodeUrl.toLowerCase().includes(lowerCaseScannedData))
    );

    if (foundItem) {
      setScannedItem(foundItem);
      setReturnQuantity("1"); // Default to 1 for scanned item
      // Suggest original picking bin or returns area based on initial reason
      setReturnDestination(foundItem.pickingBinLocation);
      showSuccess(`Scanned item: ${foundItem.name}.`);
    } else {
      showError(`No item found with SKU/Barcode: "${scannedData}".`);
      setScannedItem(null);
      setReturnQuantity("");
      setReturnDestination("");
    }
  };

  const handleScanClick = () => {
    setIsScanning(true);
    onScanRequest(handleScannedBarcode);
  };

  const handleProcessReturn = async () => {
    if (!scannedItem || !returnQuantity || !returnReason || !returnDestination) {
      showError("Please scan an item and fill in all return details.");
      return;
    }

    const quantity = parseInt(returnQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      showError("Please enter a valid positive quantity for the return.");
      return;
    }

    const oldQuantity = scannedItem.quantity;
    let newPickingBinQuantity = scannedItem.pickingBinQuantity;
    let newOverstockQuantity = scannedItem.overstockQuantity;

    const returnsAreaString = "RETURNS-AREA-01-1-A";

    if (returnDestination === scannedItem.pickingBinLocation) {
      newPickingBinQuantity += quantity;
    } else if (returnDestination === returnsAreaString) {
      newOverstockQuantity += quantity; // For simplicity, returns area items go to overstock
    } else {
      // If a different location is selected, for simplicity, add to overstock
      newOverstockQuantity += quantity;
    }

    const updatedItem = {
      ...scannedItem,
      pickingBinQuantity: newPickingBinQuantity,
      overstockQuantity: newOverstockQuantity,
      location: returnDestination, // Update primary location if it's a full return to a new spot
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    await updateInventoryItem(updatedItem);

    await addStockMovement({
      itemId: scannedItem.id,
      itemName: scannedItem.name,
      type: "add",
      amount: quantity,
      oldQuantity: oldQuantity,
      newQuantity: newPickingBinQuantity + newOverstockQuantity,
      reason: `Return: ${returnReason} to ${returnDestination}`,
    });

    await refreshInventory();
    showSuccess(`Processed return for ${quantity} units of ${scannedItem.name}. Stock updated and directed to ${returnDestination}.`);

    // Reset form
    setScannedItem(null);
    setReturnQuantity("");
    setReturnReason("");
    setReturnDestination("");
    setNotes("");
  };

  const isProcessButtonDisabled = !scannedItem || !returnQuantity || !returnReason || !returnDestination || parseInt(returnQuantity) <= 0;

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-xl font-bold text-center">Returns Processing</h2>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-primary" /> Scan Returned Item
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3 flex items-center justify-center gap-2"
            onClick={handleScanClick}
            disabled={isScanning}
          >
            <Scan className="h-6 w-6" />
            {isScanning ? "Scanning..." : "Scan Item Barcode"}
          </Button>
          {scannedItem && (
            <div className="space-y-2">
              <Label className="font-semibold">Scanned Item</Label>
              <p className="text-sm text-foreground">{scannedItem.name} (SKU: {scannedItem.sku})</p>
              <p className="text-xs text-muted-foreground">Current Stock: {scannedItem.quantity} units</p>
            </div>
          )}
        </CardContent>
      </Card>

      {scannedItem && (
        <Card className="bg-card border-border shadow-sm flex-grow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-accent" /> Return Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 flex-grow flex flex-col">
            <div className="space-y-2">
              <Label htmlFor="returnQuantity">Quantity to Return</Label>
              <Input
                id="returnQuantity"
                type="number"
                value={returnQuantity}
                onChange={(e) => setReturnQuantity(e.target.value)}
                placeholder="e.g., 1"
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnReason">Reason for Return</Label>
              <Select value={returnReason} onValueChange={(value) => {
                setReturnReason(value);
                const returnsAreaString = "RETURNS-AREA-01-1-A";
                // Suggest 'Returns Area' if damaged/defective, otherwise original picking bin
                if (value.includes("Damaged") || value.includes("Defective")) {
                  setReturnDestination(returnsAreaString);
                } else {
                  setReturnDestination(scannedItem.pickingBinLocation);
                }
              }}>
                <SelectTrigger id="returnReason">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {returnReasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnDestination">Direct to Location</Label>
              <Select value={returnDestination} onValueChange={setReturnDestination}>
                <SelectTrigger id="returnDestination">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.fullLocationString}>
                      {loc.displayName || loc.fullLocationString}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Suggested: {returnReason.includes("Damaged") || returnReason.includes("Defective") ? "Returns Area" : scannedItem.pickingBinLocation}
              </p>
            </div>
            <div className="space-y-2 flex-grow">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes about this return..."
                rows={3}
                className="flex-grow"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6">
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3 flex items-center justify-center gap-2"
          onClick={handleProcessReturn}
          disabled={isProcessButtonDisabled}
        >
          <CheckCircle className="h-6 w-6" /> Process Return
        </Button>
      </div>
    </div>
  );
};

export default ReturnsProcessingTool;