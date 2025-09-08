import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Truck, Scan, CheckCircle, XCircle, Package, ListOrdered } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { useOrders, OrderItem } from "@/context/OrdersContext";
import { useInventory } from "@/context/InventoryContext";

interface ShippingVerificationToolProps {
  onScanRequest: (callback: (scannedData: string) => void) => void;
  scannedDataFromGlobal?: string | null;
  onScannedDataProcessed: () => void;
}

const ShippingVerificationTool: React.FC<ShippingVerificationToolProps> = ({ onScanRequest, scannedDataFromGlobal, onScannedDataProcessed }) => {
  const { orders, fetchOrders, updateOrder } = useOrders();
  const { inventoryItems } = useInventory();

  const [selectedDeliveryRoute, setSelectedDeliveryRoute] = useState("all");
  const [truckId, setTruckId] = useState("");
  const [scannedItems, setScannedItems] = useState<Set<string>>(new Set()); // Stores SKUs/Barcodes of scanned items
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [isScanning, setIsScanning] = useState(false);

  const availableDeliveryRoutes = useMemo(() => {
    const routes = new Set<string>();
    orders.forEach(order => {
      if (order.type === "Sales" && order.status === "Packed" && order.deliveryRoute) {
        routes.add(order.deliveryRoute);
      }
    });
    return ["all", ...Array.from(routes).sort()];
  }, [orders]);

  const ordersForRoute = useMemo(() => {
    return orders.filter(order =>
      order.type === "Sales" &&
      order.status === "Packed" &&
      (selectedDeliveryRoute === "all" || order.deliveryRoute === selectedDeliveryRoute)
    );
  }, [orders, selectedDeliveryRoute]);

  const expectedItemsMap = useMemo(() => {
    const map = new Map<string, { itemName: string; quantity: number; scannedQuantity: number; orderId: string }>();
    ordersForRoute.forEach(order => {
      order.items.forEach(orderItem => {
        const inventoryItem = inventoryItems.find(inv => inv.id === orderItem.inventoryItemId);
        if (inventoryItem) {
          const key = inventoryItem.sku; // Use SKU as key for simplicity
          const existing = map.get(key);
          if (existing) {
            existing.quantity += orderItem.quantity;
            map.set(key, existing);
          } else {
            map.set(key, {
              itemName: inventoryItem.name,
              quantity: orderItem.quantity,
              scannedQuantity: 0,
              orderId: order.id,
            });
          }
        }
      });
    });
    return map;
  }, [ordersForRoute, inventoryItems]);

  useEffect(() => {
    setScannedItems(new Set());
    setVerificationStatus("idle");
  }, [selectedDeliveryRoute, truckId]);

  useEffect(() => {
    if (scannedDataFromGlobal && !isScanning) {
      handleScannedBarcode(scannedDataFromGlobal);
      onScannedDataProcessed();
    }
  }, [scannedDataFromGlobal, isScanning, onScannedDataProcessed]);

  const handleScannedBarcode = (scannedData: string) => {
    setIsScanning(false);
    setVerificationStatus("verifying");

    const lowerCaseScannedData = scannedData.toLowerCase();
    const foundItem = inventoryItems.find(
      (item) =>
        item.sku.toLowerCase() === lowerCaseScannedData ||
        (item.barcodeUrl && item.barcodeUrl.toLowerCase().includes(lowerCaseScannedData))
    );

    if (!foundItem) {
      showError(`Scanned item (SKU/Barcode: ${scannedData}) not found in inventory.`);
      setVerificationStatus("error");
      return;
    }

    const expectedItem = expectedItemsMap.get(foundItem.sku);

    if (!expectedItem) {
      showError(`Scanned item ${foundItem.name} (SKU: ${foundItem.sku}) is not expected for this route/truck.`);
      setVerificationStatus("error");
      return;
    }

    if (expectedItem.scannedQuantity < expectedItem.quantity) {
      setScannedItems(prev => {
        const newSet = new Set(prev);
        newSet.add(foundItem.sku); // Add SKU to track scanned items
        return newSet;
      });
      expectedItem.scannedQuantity++; // Increment scanned quantity for this item
      expectedItemsMap.set(foundItem.sku, expectedItem); // Update map
      showSuccess(`Verified: ${foundItem.name}. Scanned ${expectedItem.scannedQuantity}/${expectedItem.quantity}.`);
    } else {
      showError(`All units of ${foundItem.name} (SKU: ${foundItem.sku}) already scanned.`);
      setVerificationStatus("error");
    }

    // Check if all items are scanned
    const allItemsScanned = Array.from(expectedItemsMap.values()).every(item => item.scannedQuantity >= item.quantity);
    if (allItemsScanned) {
      setVerificationStatus("success");
      showSuccess("All items for this route/truck have been verified!");
    } else {
      setVerificationStatus("idle"); // Reset to idle to allow more scans
    }
  };

  const handleScanItem = () => {
    setIsScanning(true);
    onScanRequest(handleScannedBarcode);
  };

  const handleCompleteShipment = async () => {
    if (verificationStatus !== "success") {
      showError("Please verify all items before completing the shipment.");
      return;
    }

    // Update status of all orders in this route to "Shipped"
    for (const order of ordersForRoute) {
      await updateOrder({ ...order, status: "Shipped" });
    }
    showSuccess(`Shipment for route ${selectedDeliveryRoute} (Truck: ${truckId}) completed! Orders updated to "Shipped".`);
    setSelectedDeliveryRoute("all");
    setTruckId("");
    setScannedItems(new Set());
    setVerificationStatus("idle");
    await fetchOrders(); // Refresh orders
  };

  const isCompleteButtonDisabled = verificationStatus !== "success";

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-xl font-bold text-center">Shipping Verification</h2>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" /> Shipment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deliveryRoute">Select Delivery Route</Label>
            <Select value={selectedDeliveryRoute} onValueChange={setSelectedDeliveryRoute}>
              <SelectTrigger id="deliveryRoute">
                <SelectValue placeholder="All Routes" />
              </SelectTrigger>
              <SelectContent>
                {availableDeliveryRoutes.map(route => (
                  <SelectItem key={route} value={route}>
                    {route === "all" ? "All Routes" : route}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="truckId">Truck ID / License Plate</Label>
            <Input
              id="truckId"
              value={truckId}
              onChange={(e) => setTruckId(e.target.value)}
              placeholder="e.g., TRK-001, ABC-123"
            />
          </div>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3 flex items-center justify-center gap-2"
            onClick={handleScanItem}
            disabled={isScanning || !truckId || ordersForRoute.length === 0}
          >
            <Scan className="h-6 w-6" />
            {isScanning ? "Scanning..." : "Scan Item / Pallet"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-sm flex-grow">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-accent" /> Expected vs. Scanned
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3 flex-grow flex flex-col">
          {ordersForRoute.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-4">No packed orders for this route.</p>
          ) : (
            <ScrollArea className="flex-grow border border-border rounded-md p-3 bg-muted/20">
              <div className="space-y-2">
                {Array.from(expectedItemsMap.entries()).map(([sku, item]) => (
                  <div key={sku} className="flex justify-between items-center py-1 text-sm">
                    <span>{item.itemName} (SKU: {sku})</span>
                    <span className={`font-bold ${item.scannedQuantity >= item.quantity ? "text-green-500" : "text-yellow-500"}`}>
                      {item.scannedQuantity} / {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          {verificationStatus === "success" && (
            <div className="flex items-center justify-center text-green-500 font-semibold text-lg mt-4">
              <CheckCircle className="h-6 w-6 mr-2" /> All items verified!
            </div>
          )}
          {verificationStatus === "error" && (
            <div className="flex items-center justify-center text-destructive font-semibold text-lg mt-4">
              <XCircle className="h-6 w-6 mr-2" /> Verification Error!
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3 flex items-center justify-center gap-2"
          onClick={handleCompleteShipment}
          disabled={isCompleteButtonDisabled}
        >
          <CheckCircle className="h-6 w-6" /> Complete Shipment
        </Button>
      </div>
    </div>
  );
};

export default ShippingVerificationTool;