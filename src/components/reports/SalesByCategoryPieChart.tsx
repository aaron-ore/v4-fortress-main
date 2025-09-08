import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useInventory } from "@/context/InventoryContext";
import { useMemo } from "react";

interface SalesData {
  name: string;
  value: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))", "hsl(var(--destructive))", "hsl(var(--muted))"];

const SalesByCategoryPieChart: React.FC = () => {
  const { inventoryItems } = useInventory();

  const salesData: SalesData[] = useMemo(() => {
    if (inventoryItems.length === 0) return [];

    const categorySalesMap: { [key: string]: number } = {};
    inventoryItems.forEach(item => {
      // Simulated sales revenue should be 0 if quantity or retail price is 0
      const simulatedSalesRevenue = (item.quantity > 0 && item.retailPrice > 0) ? item.retailPrice * (item.quantity / 2 + 10) : 0;
      categorySalesMap[item.category] = (categorySalesMap[item.category] || 0) + simulatedSalesRevenue;
    });

    return Object.entries(categorySalesMap).map(([category, revenue]) => ({
      name: category,
      value: parseFloat(revenue.toFixed(2)),
    })).filter(entry => entry.value > 0).sort((a, b) => b.value - a.value); // Filter out categories with 0 sales
  }, [inventoryItems]);

  return (
    <>
      {salesData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={salesData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              innerRadius={40}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
            >
              {salesData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "0.5rem",
              }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number, name: string) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name]}
            />
            <Legend
              wrapperStyle={{ color: "hsl(var(--muted-foreground))", paddingTop: '10px' }}
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          No sales data by category available.
        </div>
      )}
    </>
  );
};

export default SalesByCategoryPieChart;