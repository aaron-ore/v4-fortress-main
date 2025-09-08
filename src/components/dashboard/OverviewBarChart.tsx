import React, { useMemo } from "react";
import {
  AreaChart, // Changed to AreaChart
  Area,       // Changed to Area
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useInventory } from "@/context/InventoryContext";
import { useOrders } from "@/context/OrdersContext";
import { format } from "date-fns";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

const OverviewBarChart: React.FC = () => {
  const { inventoryItems } = useInventory();
  const { orders } = useOrders();

  const data = useMemo(() => {
    const today = new Date();
    const dataPoints = [];

    // Generate data for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const formattedDate = format(date, "MMM dd");

      // Simulate inventory value for the day
      const totalInventoryValue = inventoryItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
      // Simulate a slight fluctuation around the current inventory value
      const simulatedInventory = totalInventoryValue > 0 ? Math.max(0, totalInventoryValue * (0.9 + Math.random() * 0.2)) : 0; // +/- 10%

      // Simulate sales for the day
      const dailySales = orders
        .filter(order => order.type === "Sales" && (parseAndValidateDate(order.date) && format(parseAndValidateDate(order.date) || new Date(), "MMM dd")) === formattedDate)
        .reduce((sum, order) => sum + order.totalAmount, 0);
      // If no actual sales, simulated sales should also be 0
      const simulatedSales = dailySales > 0 ? dailySales : 0;

      dataPoints.push({
        name: formattedDate,
        Sales: parseFloat(simulatedSales.toFixed(2)),
        Inventory: parseFloat(simulatedInventory.toFixed(2)),
      });
    }
    return dataPoints;
  }, [inventoryItems, orders]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart // Changed to AreaChart
        data={data}
        margin={{
          top: 5,
          right: 10,
          left: 10,
          bottom: 5,
        }}
      >
        <defs>
          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorInventory" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" strokeOpacity={0.3} vertical={false} />
        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
        <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
            borderRadius: "0.5rem",
          }}
          itemStyle={{ color: "hsl(var(--foreground))" }}
          formatter={(value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
        <Legend wrapperStyle={{ color: "hsl(var(--muted-foreground))" }} />
        <Area yAxisId="left" type="monotone" dataKey="Sales" stroke="hsl(var(--primary))" fill="url(#colorSales)" name="Sales" strokeWidth={3} activeDot={{ r: 8 }} /> {/* Changed to Area, added fill, increased strokeWidth */}
        <Area yAxisId="right" type="monotone" dataKey="Inventory" stroke="hsl(var(--accent))" fill="url(#colorInventory)" name="Inventory" strokeWidth={3} activeDot={{ r: 8 }} /> {/* Changed to Area, added fill, increased strokeWidth */}
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default OverviewBarChart;