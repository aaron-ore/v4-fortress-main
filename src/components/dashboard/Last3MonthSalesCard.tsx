"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useOrders } from "@/context/OrdersContext";
import { useInventory } from "@/context/InventoryContext";
import { format, subMonths, isValid, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

interface Last3MonthSalesCardProps {
  // Removed dateRange prop
}

const Last3MonthSalesCard: React.FC<Last3MonthSalesCardProps> = () => {
  const { orders } = useOrders();
  const { inventoryItems } = useInventory();

  const data = useMemo(() => {
    const today = new Date();
    const monthlyData: { [key: string]: { salesRevenue: number; newInventory: number; itemsShipped: number } } = {};

    // Default to last 3 months if no dateRange is provided
    const effectiveFrom = subMonths(today, 2);
    const effectiveTo = today;

    let startDate = startOfMonth(effectiveFrom);
    let endDate = endOfMonth(effectiveTo);

    if (startDate.getTime() > endDate.getTime()) {
      [startDate, endDate] = [endDate, startDate];
    }

    let currentDate = new Date(startDate);
    while (currentDate.getTime() <= endDate.getTime()) {
      const monthKey = format(currentDate, "MMM yyyy");
      monthlyData[monthKey] = { salesRevenue: 0, newInventory: 0, itemsShipped: 0 };
      currentDate = subMonths(currentDate, -1);
    }

    orders.filter(order => order.type === "Sales").forEach(order => {
      const orderDate = parseAndValidateDate(order.date); // NEW: Use parseAndValidateDate
      if (!orderDate || !isValid(orderDate)) return; // Ensure valid date
      const monthKey = format(orderDate, "MMM yyyy");
      if (monthlyData[monthKey] && orderDate >= startDate && orderDate <= endDate) {
        monthlyData[monthKey].salesRevenue += order.totalAmount;
        monthlyData[monthKey].itemsShipped += order.itemCount;
      }
    });

    inventoryItems.forEach(item => {
      const itemDate = parseAndValidateDate(item.lastUpdated); // NEW: Use parseAndValidateDate
      if (!itemDate || !isValid(itemDate)) return; // Ensure valid date
      const monthKey = format(itemDate, "MMM yyyy");
      if (monthlyData[monthKey] && itemDate >= startDate && itemDate <= endDate) {
        monthlyData[monthKey].newInventory += Math.floor(item.quantity * 0.2);
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
      "New Inventory Added": parseFloat(monthlyData[monthKey].newInventory.toFixed(0)),
      "Items Shipped": parseFloat(monthlyData[monthKey].itemsShipped.toFixed(0)),
    }));
  }, [orders, inventoryItems]); // Removed dateRange from dependencies

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4 flex flex-col h-[310px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold text-foreground">Last 3 Months Activity</CardTitle>
        <p className="text-sm text-muted-foreground">Sales, Inventory & Shipments</p>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0 flex flex-col justify-between">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 0,
              left: 0,
              bottom: 5,
            }}
            barCategoryGap="30%"
          >
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
            <YAxis hide />
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
                if (name === "Sales Revenue") {
                  return [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name];
                }
                return [value.toLocaleString('en-US'), name];
              }}
            />
            <Bar dataKey="Sales Revenue" stackId="a" fill="#00C49F" />
            <Bar dataKey="New Inventory Added" stackId="a" fill="#00BFD8" />
            <Bar dataKey="Items Shipped" stackId="a" fill="#0088FE" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default Last3MonthSalesCard;