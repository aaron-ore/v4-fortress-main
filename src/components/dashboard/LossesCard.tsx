"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { ArrowDown } from "lucide-react";
import { useOrders } from "@/context/OrdersContext";
import { useInventory } from "@/context/InventoryContext";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

const LossesCard: React.FC = () => {
  const { orders } = useOrders();
  const { inventoryItems } = useInventory();

  const totalLosses = useMemo(() => {
    let simulatedLosses = 0;

    // Simulate losses from sales (e.g., returns, discounts, damages)
    const totalSalesRevenue = orders
      .filter(order => order.type === "Sales")
      .reduce((sum, order) => sum + order.totalAmount, 0);
    simulatedLosses += totalSalesRevenue * 0.05; // 5% of sales revenue as losses

    // Simulate losses from inventory (e.g., shrinkage, obsolescence)
    const totalInventoryValue = inventoryItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    simulatedLosses += totalInventoryValue * 0.02; // 2% of inventory value as losses

    return simulatedLosses;
  }, [orders, inventoryItems]);

  // Generate dynamic data for the mini trend chart (downward trend)
  const data = useMemo(() => {
    if (totalLosses === 0) return [{ name: "A", value: 0 }]; // Ensure at least one data point for chart to render

    const baseValue = totalLosses / 0.9; // Start higher than current losses
    return Array.from({ length: 7 }, (_, i) => {
      const value = baseValue * (1 - (i / 10)) + (Math.random() - 0.5) * (baseValue * 0.02); // Decreasing trend with slight fluctuation
      return { name: String.fromCharCode(65 + i), value: Math.max(0, value) };
    }).reverse(); // Reverse to show trend from left to right
  }, [totalLosses]);

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm flex flex-col h-[74px] p-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0">
        <div className="flex items-center gap-1">
          <CardTitle className="text-xs font-bold text-foreground">Losses</CardTitle>
          <ArrowDown className="h-3 w-3 text-destructive" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-between p-0">
        <div className="text-sm font-bold text-foreground">
          ${totalLosses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <LineChart width={80} height={15} data={data}>
          <Line type="monotone" dataKey="value" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
        </LineChart>
      </CardContent>
    </Card>
  );
};

export default LossesCard;