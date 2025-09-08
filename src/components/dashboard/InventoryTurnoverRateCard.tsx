import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { useInventory } from "@/context/InventoryContext";
import { useOrders } from "@/context/OrdersContext";

const InventoryTurnoverRateCard: React.FC = () => {
  const { inventoryItems } = useInventory();
  const { orders } = useOrders();

  const inventoryTurnoverRate = useMemo(() => {
    if (inventoryItems.length === 0 || orders.length === 0) return "0x";

    const totalInventoryCost = inventoryItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    const totalSalesRevenue = orders
      .filter(order => order.type === "Sales")
      .reduce((sum, order) => sum + order.totalAmount, 0);

    if (totalInventoryCost === 0) return "N/A";

    // Simulate turnover based on recent sales and inventory cost
    const mockTurnover = (totalSalesRevenue * 0.6) / totalInventoryCost; // Using 0.6 as a cost of goods sold approximation
    return `${mockTurnover.toFixed(1)}x`;
  }, [inventoryItems, orders]);

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-center text-foreground">Inventory Turnover Rate</CardTitle> {/* Increased title size */}
        <RefreshCw className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{inventoryTurnoverRate}</div>
        <p className="text-xs text-muted-foreground mt-1">Times inventory was sold and replaced in a period.</p>
        <p className="text-xs text-muted-foreground mt-1">Higher is generally better, indicating efficient sales.</p>
      </CardContent>
    </Card>
  );
};

export default InventoryTurnoverRateCard;