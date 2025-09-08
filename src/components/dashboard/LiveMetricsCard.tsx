import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInventory } from "@/context/InventoryContext";
import { useOrders } from "@/context/OrdersContext";
import { useStockMovement } from "@/context/StockMovementContext";
import { useVendors } from "@/context/VendorContext";
import { format } from "date-fns";

interface ProgressBarProps {
  value: number;
  color: string;
  label: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, color, label }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-muted-foreground w-6 text-right">{label}</span>
    <Progress value={value} className="h-2 flex-grow" style={{ '--progress-background': color } as React.CSSProperties} />
  </div>
);

const LiveMetricsCard: React.FC = () => {
  const { inventoryItems } = useInventory();
  const { orders } = useOrders();
  const { stockMovements } = useStockMovement();
  const { vendors } = useVendors();

  const metrics = useMemo(() => {
    const today = new Date();
    const todayString = format(today, "yyyy-MM-dd");

    const lowStockItemsCount = inventoryItems.filter(item => item.quantity <= item.reorderLevel).length;
    const ordersDueTodayCount = orders.filter(
      order => format(new Date(order.dueDate), "yyyy-MM-dd") === todayString && order.status !== "Shipped" && order.status !== "Packed"
    ).length;
    const incomingShipmentsCount = orders.filter(order => order.type === "Purchase" && order.status !== "Shipped").length;
    const recentAdjustmentsCount = stockMovements.filter(
      movement => format(new Date(movement.timestamp), "yyyy-MM-dd") === todayString
    ).length;

    const allCounts = [lowStockItemsCount, ordersDueTodayCount, incomingShipmentsCount, recentAdjustmentsCount];
    const maxCount = Math.max(...allCounts, 1);

    return {
      lowStockItemsCount,
      ordersDueTodayCount,
      incomingShipmentsCount,
      recentAdjustmentsCount,
      maxCount,
    };
  }, [inventoryItems, orders, stockMovements]);

  const barData = [
    { label: metrics.lowStockItemsCount, value: (metrics.lowStockItemsCount / metrics.maxCount) * 100, color: "hsl(var(--primary))" },
    { label: metrics.ordersDueTodayCount, value: (metrics.ordersDueTodayCount / metrics.maxCount) * 100, color: "hsl(var(--accent))" }, // Changed color
    { label: metrics.incomingShipmentsCount, value: (metrics.incomingShipmentsCount / metrics.maxCount) * 100, color: "hsl(var(--secondary))" }, // Changed color
    { label: metrics.recentAdjustmentsCount, value: (metrics.recentAdjustmentsCount / metrics.maxCount) * 100, color: "hsl(var(--muted))" }, // Changed color
  ];

  const buttonData = [
    { value: inventoryItems.length, label: "Items", variant: "default" as const },
    { value: orders.length, label: "Orders", variant: "secondary" as const },
    { value: vendors.length, label: "Vendors", variant: "outline" as const },
    { value: stockMovements.length, label: "Adjustments", variant: "ghost" as const },
  ];

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4 flex flex-col h-[310px]"> {/* Added flex-col h-[310px] */}
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold text-foreground">Key Operational Metrics</CardTitle>
        <p className="text-sm text-muted-foreground">Real-time snapshot of key activities</p>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 p-4 pt-0 flex flex-col justify-between"> {/* Changed to flex-grow */}
        <div className="space-y-2">
          {barData.map((bar, index) => (
            <ProgressBar key={index} value={bar.value} color={bar.color} label={String(bar.label)} />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 mt-4">
          {buttonData.map((btn, index) => (
            <div key={index} className="flex flex-col items-center">
              <Button
                variant={btn.variant}
                className={cn("h-8 w-full text-xs font-bold")}
              >
                {btn.value}
              </Button>
              <span className="text-xs text-muted-foreground mt-1">{btn.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveMetricsCard;