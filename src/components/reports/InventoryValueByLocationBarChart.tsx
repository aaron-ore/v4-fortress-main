import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useInventory } from "@/context/InventoryContext";
import { useMemo } from "react";

interface LocationValueData {
  name: string;
  "Inventory Value": number;
}

const InventoryValueByLocationBarChart: React.FC = () => {
  const { inventoryItems } = useInventory();

  const data: LocationValueData[] = useMemo(() => {
    if (inventoryItems.length === 0) return [];

    const locationValueMap: { [key: string]: number } = {};
    inventoryItems.forEach(item => {
      locationValueMap[item.location] = (locationValueMap[item.location] || 0) + (item.quantity * item.unitCost);
    });

    return Object.entries(locationValueMap).map(([location, value]) => ({
      name: location,
      "Inventory Value": parseFloat(value.toFixed(2)),
    })).sort((a, b) => b["Inventory Value"] - a["Inventory Value"]);
  }, [inventoryItems]);

  return (
    <>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 0, // Adjusted left margin to 0, YAxis will handle its own width
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} width={100} /> {/* Increased YAxis width */}
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
            <Bar dataKey="Inventory Value" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          No inventory value data by location available.
        </div>
      )}
    </>
  );
};

export default InventoryValueByLocationBarChart;