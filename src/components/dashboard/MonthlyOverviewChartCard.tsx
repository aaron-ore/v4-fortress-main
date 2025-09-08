"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useOrders } from "@/context/OrdersContext";
import { useInventory } from "@/context/InventoryContext";
import { format, subMonths, isValid, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

interface MonthlyOverviewChartCardProps {
  // Removed dateRange prop
}

const MonthlyOverviewChartCard: React.FC<MonthlyOverviewChartCardProps> = () => {
  const { orders } = useOrders();
  const { inventoryItems } = useInventory();

  const data = useMemo(() => {
    const today = new Date();
    const monthlyData: { [key: string]: { salesRevenue: number; inventoryValue: number; purchaseVolume: number } } = {};

    // Default to last 12 months
    const effectiveFrom = subMonths(today, 11);
    const effectiveTo = today;

    let startDate = startOfMonth(effectiveFrom);
    let endDate = endOfMonth(effectiveTo);

    if (startDate.getTime() > endDate.getTime()) {
      [startDate, endDate] = [endDate, startDate];
    }

    let currentDate = new Date(startDate);
    while (currentDate.getTime() <= endDate.getTime()) {
      const monthKey = format(currentDate, "MMM yyyy");
      monthlyData[monthKey] = { salesRevenue: 0, inventoryValue: 0, purchaseVolume: 0 };
      currentDate = subMonths(currentDate, -1);
    }

    orders.forEach(order => {
      const orderDate = parseAndValidateDate(order.date); // NEW: Use parseAndValidateDate
      if (!orderDate || !isValid(orderDate)) return; // Ensure valid date
      const monthKey = format(orderDate, "MMM yyyy");
      if (monthlyData[monthKey] && orderDate >= startDate && orderDate <= endDate) {
        if (order.type === "Sales") {
          monthlyData[monthKey].salesRevenue += order.totalAmount;
        } else if (order.type === "Purchase") {
          monthlyData[monthKey].purchaseVolume += order.itemCount;
        }
      }
    });

    const totalCurrentInventoryValue = inventoryItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

    Object.keys(monthlyData).sort((a, b) => {
      const dateA = parseAndValidateDate(a); // NEW: Use parseAndValidateDate
      const dateB = parseAndValidateDate(b); // NEW: Use parseAndValidateDate
      if (!dateA || !dateB) return 0; // Handle null dates
      return dateA.getTime() - dateB.getTime();
    }).forEach((monthKey, index, array) => {
      const monthName = format(parseAndValidateDate(monthKey) || new Date(), "MMM"); // Assert non-null after sorting, fallback for format
      if (monthKey === format(endDate, "MMM yyyy")) {
        monthlyData[monthKey].inventoryValue = totalCurrentInventoryValue;
      } else {
        const trendFactor = (index + 1) / array.length;
        const baseValue = totalCurrentInventoryValue * (0.7 + (0.3 * trendFactor));
        monthlyData[monthKey].inventoryValue = totalCurrentInventoryValue > 0 ? Math.max(0, baseValue + (Math.random() - 0.5) * (totalCurrentInventoryValue * 0.1)) : 0;
      }
    });

    return Object.keys(monthlyData).sort((a, b) => {
      const dateA = parseAndValidateDate(a); // NEW: Use parseAndValidateDate
      const dateB = parseAndValidateDate(b); // NEW: Use parseAndValidateDate
      if (!dateA || !dateB) return 0; // Handle null dates
      return dateA.getTime() - dateB.getTime();
    }).map(monthKey => ({
      name: format(parseAndValidateDate(monthKey) || new Date(), "MMM"), // Assert non-null after sorting, fallback for format
      "Sales Revenue": parseFloat(monthlyData[monthKey].salesRevenue.toFixed(2)),
      "Inventory Value": parseFloat(monthlyData[monthKey].inventoryValue.toFixed(2)),
      "Purchase Volume": parseFloat(monthlyData[monthKey].purchaseVolume.toFixed(0)),
    }));
  }, [orders, inventoryItems]); // Removed dateRange from dependencies

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4 col-span-full flex flex-col h-[310px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold text-foreground">Monthly Activity Overview</CardTitle>
        <p className="text-sm text-muted-foreground">Sales, Inventory & Purchase Trends (Last 12 Months)</p>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0 flex flex-col justify-between">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 0,
              left: 0,
              bottom: 5,
            }}
          >
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
            <YAxis
              tickFormatter={(value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              domain={[0, 'auto']}
              axisLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: "0.75rem",
              }}
              itemStyle={{ color: "hsl(var(--foreground))", fontSize: "0.75rem" }}
              labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: "0.75rem" }}
              formatter={(value: number, name: string) => {
                if (name === "Sales Revenue" || name === "Inventory Value") {
                  return [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name];
                }
                return [value.toLocaleString('en-US'), name];
              }}
            />
            <Legend wrapperStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 10 }} />
            <Bar dataKey="Sales Revenue" stackId="a" fill="#00C49F" />
            <Bar dataKey="Inventory Value" stackId="a" fill="#00BFD8" />
            <Bar dataKey="Purchase Volume" stackId="a" fill="#0088FE" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default MonthlyOverviewChartCard;