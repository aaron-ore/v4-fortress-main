import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useInventory } from "@/context/InventoryContext";

const StockLevelTrendLineChart: React.FC = () => {
  const { inventoryItems } = useInventory();

  const stockTrendData = useMemo(() => {
    if (inventoryItems.length === 0) return [];

    const dataPoints = [];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = new Date().getMonth();

    for (let i = 0; i < 12; i++) {
      const monthIndex = (currentMonth - 11 + i + 12) % 12; // Get last 12 months
      const monthName = months[monthIndex];

      // Simulate stock based on current inventory, with some fluctuation
      const totalQuantity = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
      const simulatedStock = totalQuantity > 0 ? Math.max(0, totalQuantity + (Math.random() - 0.5) * totalQuantity * 0.1) : 0;

      dataPoints.push({ name: monthName, "Total Stock": parseFloat(simulatedStock.toFixed(0)) });
    }
    return dataPoints;
  }, [inventoryItems]);

  return (
    <>
      {stockTrendData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={stockTrendData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "0.5rem",
              }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend wrapperStyle={{ color: "hsl(var(--muted-foreground))" }} />
            <Line type="monotone" dataKey="Total Stock" stroke="hsl(var(--accent))" activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          No stock level trend data available.
        </div>
      )}
    </>
  );
};

export default StockLevelTrendLineChart;