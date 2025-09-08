"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useOrders } from "@/context/OrdersContext"; // Import useOrders

const OrderFulfillmentRateCard: React.FC = () => {
  const { orders } = useOrders();

  const totalOrders = orders.length;
  const fulfilledOrders = orders.filter(
    (order) => order.status === "Shipped" || order.status === "Packed"
  ).length;

  const fulfillmentPercentage = totalOrders > 0 ? Math.round((fulfilledOrders / totalOrders) * 100) : 0;
  const pendingPercentage = 100 - fulfillmentPercentage;

  const data = [
    { name: "Fulfilled", value: fulfillmentPercentage },
    { name: "Pending", value: pendingPercentage },
  ];

  const COLORS = ["#00C49F", "hsl(var(--muted))"]; // Green for fulfilled, muted for pending

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4 flex flex-col h-[310px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold text-foreground">Fulfillment Rate</CardTitle>
        <p className="text-sm text-muted-foreground">Orders Fulfilled</p>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col items-center justify-center relative p-4 pt-0">
        {totalOrders > 0 ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  fill="#8884d8"
                  paddingAngle={0}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  cornerRadius={5}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                {/* Outer ring for visual effect */}
                <Pie
                  data={[{ value: 100 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  startAngle={90}
                  endAngle={-270}
                  cornerRadius={5}
                  isAnimationActive={false}
                  fillOpacity={0.2}
                  dataKey="value"
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <p className="text-4xl font-bold text-foreground flex items-center justify-center">
                <ArrowUp className="h-6 w-6 text-green-500 mr-1" /> {fulfillmentPercentage}%
              </p>
              <p className="text-sm text-muted-foreground flex items-center justify-center">
                <ArrowDown className="h-4 w-4 text-destructive mr-1" /> {pendingPercentage}%
              </p>
            </div>
            <div className="absolute bottom-2 w-full flex justify-between px-8 text-muted-foreground text-sm">
              <span>0%</span>
              <span>100%</span>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No orders to display fulfillment rate.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderFulfillmentRateCard;