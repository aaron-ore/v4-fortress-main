"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ArrowUp, ArrowDown } from "lucide-react";
import MiniTrendChart from "@/components/dashboard/MiniTrendChart";
import { useInventory } from "@/context/InventoryContext";
import { format, subMonths, isValid } from "date-fns"; // NEW: Import format, subMonths, isValid
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

const TotalStockValueCard: React.FC = () => {
  const { inventoryItems } = useInventory();

  const totalStockValue = useMemo(() => {
    return inventoryItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  }, [inventoryItems]);

  // Mock previous month's stock value for comparison
  const previousMonthStockValue = useMemo(() => {
    // Simulate a plausible previous month value based on current totalStockValue
    // For a new app, this ensures the comparison is always relevant to the current state.
    return totalStockValue * (1 + (Math.random() * 0.1 - 0.05)); // +/- 5% fluctuation
  }, [totalStockValue]);

  const percentageChange = totalStockValue > previousMonthStockValue ?
    (((totalStockValue - previousMonthStockValue) / previousMonthStockValue) * 100).toFixed(1) :
    (((previousMonthStockValue - totalStockValue) / previousMonthStockValue) * 100).toFixed(1);
  const isPositiveChange = totalStockValue >= previousMonthStockValue;

  // Data for the MiniTrendChart (line chart) - now for the last 6 months
  const chartData = useMemo(() => {
    const dataPoints = [];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonthIndex = new Date().getMonth();

    for (let i = 0; i < 6; i++) {
      const month = subMonths(new Date(), 5 - i); // Get the actual month for the data point
      const monthName = format(month, "MMM");

      // Simulate stock value for each month, with current month being actual totalStockValue
      let simulatedValue;
      if (i === 5) { // Current month
        simulatedValue = totalStockValue;
      } else {
        // Generate values that fluctuate around a base, ensuring they don't go below 0
        // The base value trends towards the current totalStockValue
        const trendFactor = (i + 1) / 6; // Increases from 1/6 to 6/6
        const baseValue = totalStockValue * (0.7 + (0.3 * trendFactor)); // Starts lower, trends towards current
        simulatedValue = Math.max(0, baseValue + (Math.random() - 0.5) * (totalStockValue * 0.1)); // Add some random fluctuation
      }
      dataPoints.push({ name: monthName, value: parseFloat(simulatedValue.toFixed(2)) });
    }
    return dataPoints;
  }, [totalStockValue]);

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-foreground">Total Stock Value</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="text-center p-4 pt-0 flex flex-col justify-between h-full">
        <div>
          <div className="text-2xl font-bold">${totalStockValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <p className={`text-xs ${isPositiveChange ? "text-green-500" : "text-red-500"} flex items-center justify-center`}>
            {isPositiveChange ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />} {percentageChange}% from last month
          </p>
        </div>
        {totalStockValue > 0 || chartData.length > 0 ? (
          <MiniTrendChart
            data={chartData}
            dataKey="value"
            color="hsl(var(--primary))"
            valueFormatter={(value) => `$${value.toFixed(0)}`}
            className="mt-6"
          />
        ) : (
          <div className="h-24 flex items-center justify-center text-muted-foreground text-xs mt-6">No stock value data.</div>
        )}
      </CardContent>
    </Card>
  );
};

export default TotalStockValueCard;