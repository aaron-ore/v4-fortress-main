"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useInventory } from "@/context/InventoryContext"; // Corrected import path
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

const TopSellingProductsCard: React.FC = () => {
  const { inventoryItems } = useInventory();

  const topSellingProducts = useMemo(() => {
    if (inventoryItems.length === 0) return [];
    return inventoryItems
      .map(item => ({
        name: item.name,
        // Simulate units sold based on current quantity, making it dynamic
        unitsSold: item.quantity > 0 ? Math.floor(item.quantity * (0.1 + Math.random() * 0.4)) + 1 : 0, // 10-50% of current stock, plus 1, or 0 if no stock
      }))
      .filter(product => product.unitsSold > 0) // Filter out items with 0 units sold
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5); // Display top 5 items
  }, [inventoryItems]);

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4 flex flex-col h-[310px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-foreground">Top 5 Selling Products (Last 30 Days)</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow flex flex-col justify-between">
        {topSellingProducts.length > 0 ? (
          <ul className="text-sm space-y-2">
            {topSellingProducts.map((product, index) => (
              <li key={index} className="flex justify-between items-center">
                <span>{index + 1}. {product.name}</span>
                <span className="text-muted-foreground text-xs">{product.unitsSold} units</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-muted-foreground text-sm py-4">No product sales data available.</p>
        )}
        <p className="text-xs text-muted-foreground mt-auto text-center">Helps guide restocking and forecasting.</p>
      </CardContent>
    </Card>
  );
};

export default TopSellingProductsCard;