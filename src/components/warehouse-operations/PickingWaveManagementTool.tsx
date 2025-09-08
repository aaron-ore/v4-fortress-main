import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListOrdered, Printer, Package, Truck, CheckCircle } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { useOrders, OrderItem } from "@/context/OrdersContext";
import { useInventory } from "@/context/InventoryContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { usePrint } from "@/context/PrintContext";
import { format } from "date-fns";
import { generateSequentialNumber } from "@/utils/numberGenerator";

interface PickListItem {
  itemName: string;
  itemSku: string;
  pickingBinLocation: string;
  quantityToPick: number;
}

const PickingWaveManagementTool: React.FC = () => {
  const { orders, updateOrder } = useOrders();
  const { inventoryItems } = useInventory();
  const { companyProfile } = useOnboarding();
  const { initiatePrint } = usePrint();

  const [selectedDeliveryRoute, setSelectedDeliveryRoute] = useState("all");
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set()); // Corrected useState initialization
  const [generatedPickList, setGeneratedPickList] = useState<PickListItem[]>([]);
  const [currentWaveId, setCurrentWaveId] = useState<string | null>(null);

  const availableDeliveryRoutes = useMemo(() => {
    const routes = new Set<string>();
    orders.forEach(order => {
      if (order.type === "Sales" && order.status === "New Order" && order.deliveryRoute) {
        routes.add(order.deliveryRoute);
      }
    });
    return ["all", ...Array.from(routes).sort()];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesRoute = selectedDeliveryRoute === "all" || order.deliveryRoute === selectedDeliveryRoute;
      const isSalesOrder = order.type === "Sales";
      const isNewOrder = order.status === "New Order";
      return matchesRoute && isSalesOrder && isNewOrder;
    });
  }, [orders, selectedDeliveryRoute]);

  useEffect(() => {
    // Clear selected orders when route filter changes
    setSelectedOrderIds(new Set<string>()); // Corrected usage
    setGeneratedPickList([]);
    setCurrentWaveId(null);
  }, [selectedDeliveryRoute]);

  const handleOrderSelection = (orderId: string, checked: boolean) => {
    setSelectedOrderIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return newSet;
    });
  };

  const handleCreatePickingWave = () => {
    if (selectedOrderIds.size === 0) { // Corrected usage
      showError("Please select at least one order to create a picking wave.");
      return;
    }

    const ordersToBatch = Array.from(selectedOrderIds).map(id => orders.find(o => o.id === id)).filter(Boolean) as OrderItem[];

    const pickListItemsMap = new Map<string, PickListItem>(); // Key: itemSku

    ordersToBatch.forEach(order => {
      order.items.forEach(orderItem => {
        const inventoryItem = inventoryItems.find(inv => inv.id === orderItem.inventoryItemId);
        if (inventoryItem) {
          const key = inventoryItem.sku;
          if (pickListItemsMap.has(key)) {
            const existing = pickListItemsMap.get(key)!;
            existing.quantityToPick += orderItem.quantity;
            pickListItemsMap.set(key, existing);
          } else {
            pickListItemsMap.set(key, {
              itemName: inventoryItem.name,
              itemSku: inventoryItem.sku,
              pickingBinLocation: inventoryItem.pickingBinLocation, // fullLocationString
              quantityToPick: orderItem.quantity,
            });
          }
        } else {
          console.warn(`Inventory item not found for order item: ${orderItem.itemName}`);
        }
      });
    });

    // Sort pick list items by picking bin location for efficient path
    const sortedPickList = Array.from(pickListItemsMap.values()).sort((a, b) =>
      a.pickingBinLocation.localeCompare(b.pickingBinLocation)
    );

    setGeneratedPickList(sortedPickList);
    const newWaveId = generateSequentialNumber("WAVE");
    setCurrentWaveId(newWaveId);

    // Update status of batched orders to "Processing"
    ordersToBatch.forEach(order => {
      updateOrder({ ...order, status: "Processing" });
    });

    showSuccess(`Picking Wave ${newWaveId} created for ${selectedOrderIds.size} orders.`); // Corrected usage
  };

  const handlePrintPickList = () => {
    if (!currentWaveId || generatedPickList.length === 0) {
      showError("No picking wave generated to print.");
      return;
    }
    if (!companyProfile) {
      showError("Company profile not set up. Please complete onboarding or set company details in settings.");
      return;
    }

    const ordersInWaveDetails = Array.from(selectedOrderIds).map(id => {
      const order = orders.find(o => o.id === id);
      return order ? { id: order.id, customerSupplier: order.customerSupplier, deliveryRoute: order.deliveryRoute } : null;
    }).filter(Boolean) as { id: string; customerSupplier: string; deliveryRoute?: string }[];

    const pdfProps = {
      companyName: companyProfile.name,
      companyAddress: companyProfile.address,
      companyContact: companyProfile.currency,
      companyLogoUrl: localStorage.getItem("companyLogo") || undefined,
      waveId: currentWaveId,
      pickDate: format(new Date(), "MMM dd, yyyy"),
      ordersInWave: ordersInWaveDetails,
      pickListItems: generatedPickList,
      pickerName: companyProfile.name, // Placeholder for picker name
    };

    initiatePrint({ type: "picking-wave", props: pdfProps });
    showSuccess("Picking wave pick list sent to printer!");
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-xl font-bold text-center">Picking Wave Management</h2>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" /> Select Orders for Wave
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deliveryRouteFilter" className="font-semibold">Filter by Delivery Route</Label>
            <Select value={selectedDeliveryRoute} onValueChange={setSelectedDeliveryRoute}>
              <SelectTrigger id="deliveryRouteFilter">
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
            <Label className="font-semibold">Available Sales Orders</Label>
            <ScrollArea className="h-40 border border-border rounded-md p-3 bg-muted/20">
              {filteredOrders.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">No new sales orders for this route.</p>
              ) : (
                <div className="space-y-2">
                  {filteredOrders.map(order => (
                    <div key={order.id} className="flex items-center justify-between py-1">
                      <Label htmlFor={`order-${order.id}`} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          id={`order-${order.id}`}
                          checked={selectedOrderIds.has(order.id)} // Corrected usage
                          onCheckedChange={(checked: boolean) => handleOrderSelection(order.id, checked)}
                        />
                        <span>{order.id} - {order.customerSupplier} (Route: {order.deliveryRoute || 'N/A'})</span>
                      </Label>
                      <span className="text-sm text-muted-foreground">${order.totalAmount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          <Button onClick={handleCreatePickingWave} className="w-full" disabled={selectedOrderIds.size === 0}> {/* Corrected usage */}
            <ListOrdered className="h-4 w-4 mr-2" /> Create Picking Wave ({selectedOrderIds.size} Orders) {/* Corrected usage */}
          </Button>
        </CardContent>
      </Card>

      {generatedPickList.length > 0 && (
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-accent" /> Picking Wave {currentWaveId}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <p className="text-muted-foreground text-sm">
              Consolidated pick list, sequenced by location for efficiency.
            </p>
            <ScrollArea className="h-60 border border-border rounded-md p-3 bg-muted/20">
              <div className="space-y-2">
                {generatedPickList.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary">{item.pickingBinLocation}</span>
                      <span>{item.itemName} (SKU: {item.itemSku})</span>
                    </div>
                    <span className="font-bold">{item.quantityToPick} units</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Button onClick={handlePrintPickList} className="w-full">
              <Printer className="h-4 w-4 mr-2" /> Print Pick List
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => { setSelectedOrderIds(new Set<string>()); setGeneratedPickList([]); setCurrentWaveId(null); showSuccess("Picking wave cleared."); }}> {/* Corrected usage */}
              <CheckCircle className="h-4 w-4 mr-2" /> Complete Wave (Clear)
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PickingWaveManagementTool;