import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Boxes, ArrowUp, ArrowDown } from "lucide-react";
import TopStockBulletGraph from "@/components/dashboard/TopStockBulletGraph";
import { useInventory } from "@/context/InventoryContext";

const StockOnHandCard: React.FC = () => {
  const { inventoryItems } = useInventory();

  const totalUnitsOnHand = useMemo(() => {
    return inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [inventoryItems]);

  // Mock previous week's units on hand for comparison
  const previousWeekUnitsOnHand = useMemo(() => {
    // Simulate a plausible previous week value based on current totalUnitsOnHand
    return totalUnitsOnHand * (1 + (Math.random() * 0.1 - 0.05)); // +/- 5% fluctuation
  }, [totalUnitsOnHand]);

  const percentageChange = totalUnitsOnHand > previousWeekUnitsOnHand ?
    (((totalUnitsOnHand - previousWeekUnitsOnHand) / previousWeekUnitsOnHand) * 100).toFixed(1) :
    (((previousWeekUnitsOnHand - totalUnitsOnHand) / previousWeekUnitsOnHand) * 100).toFixed(1);
  const isPositiveChange = totalUnitsOnHand >= previousWeekUnitsOnHand;

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-foreground">Stock on Hand</CardTitle>
        <Boxes className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="text-center p-4 pt-0 flex flex-col justify-between h-full">
        <div>
          <div className="text-2xl font-bold">{totalUnitsOnHand.toLocaleString()} Units</div>
          <p className={`text-xs ${isPositiveChange ? "text-green-500" : "text-red-500"} flex items-center justify-center`}>
            {isPositiveChange ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />} {percentageChange}% from last week
          </p>
        </div>
        {totalUnitsOnHand > 0 ? (
          <TopStockBulletGraph />
        ) : (
          <div className="h-24 flex items-center justify-center text-muted-foreground text-xs mt-6">No stock on hand data.</div>
        )}
      </CardContent>
    </Card>
  );
};

export default StockOnHandCard;