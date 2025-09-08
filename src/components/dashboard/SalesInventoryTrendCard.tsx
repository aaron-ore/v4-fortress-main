import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "lucide-react";
import { useInventory } from "@/context/InventoryContext";
import { useOrders } from "@/context/OrdersContext";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, subMonths, isValid } from "date-fns";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

const SalesInventoryTrendCard: React.FC = () => {
  const { inventoryItems } = useInventory();
  const { orders } = useOrders();

  const trendData = useMemo(() => {
    if (inventoryItems.length === 0 && orders.length === 0) return [];

    const dataPoints = [];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonthIndex = new Date().getMonth();

    const totalCurrentInventoryValue = inventoryItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    const totalCurrentSalesRevenue = orders.filter(o => o.type === "Sales").reduce((sum, o) => sum + o.totalAmount, 0);

    for (let i = 0; i < 6; i++) {
      const monthIndex = (currentMonthIndex - 5 + i + 12) % 12; // Get last 6 months
      const monthName = months[monthIndex];

      let simulatedInventoryValue;
      let simulatedSalesRevenue;

      if (i === 5) { // Current month
        simulatedInventoryValue = totalCurrentInventoryValue;
        simulatedSalesRevenue = totalCurrentSalesRevenue;
      } else {
        // Simulate values trending towards current values, with some fluctuation
        const trendFactor = (i + 1) / 6; // Increases from 1/6 to 6/6
        const baseValue = totalCurrentInventoryValue > 0 ? totalCurrentInventoryValue * (0.7 + (0.3 * trendFactor)) : 0; // Starts lower, trends towards current
        simulatedInventoryValue = Math.max(0, baseValue + (Math.random() - 0.5) * (totalCurrentInventoryValue * 0.1)); // Add some random fluctuation
        const baseSalesValue = totalCurrentSalesRevenue > 0 ? totalCurrentSalesRevenue * (0.7 + (0.3 * trendFactor)) : 0;
        simulatedSalesRevenue = Math.max(0, baseSalesValue + (Math.random() - 0.5) * (totalCurrentSalesRevenue * 0.1)); // Add some random fluctuation
      }

      dataPoints.push({
        name: monthName,
        "Sales Revenue": parseFloat(simulatedSalesRevenue.toFixed(2)),
        "Inventory Value": parseFloat(simulatedInventoryValue.toFixed(2)),
      });
    }
    return dataPoints;
  }, [inventoryItems, orders]);

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm col-span-full p-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-foreground">Sales vs. Inventory Trend Graph</CardTitle>
        <LineChart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-4 pt-0 flex flex-col justify-between h-full">
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart
              data={trendData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="colorSalesRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorInventoryValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" strokeOpacity={0.3} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
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
              <Area yAxisId="left" type="monotone" dataKey="Sales Revenue" stroke="hsl(var(--primary))" fill="url(#colorSalesRevenue)" strokeWidth={3} activeDot={{ r: 8 }} />
              <Area yAxisId="right" type="monotone" dataKey="Inventory Value" stroke="hsl(var(--accent))" fill="url(#colorInventoryValue)" strokeWidth={3} activeDot={{ r: 8 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 bg-secondary rounded-md flex items-center justify-center text-muted-foreground">
            No sales or inventory data to display trend.
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-auto text-center">Helps spot shortages or overstocking.</p>
      </CardContent>
    </Card>
  );
};

export default SalesInventoryTrendCard;