"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useOrders } from "@/context/OrdersContext";
import { useStockMovement } from "@/context/StockMovementContext";
import { format, subDays, isValid, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { DateRange } from "react-day-picker";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

interface LiveInformationAreaChartCardProps {
  dateRange: DateRange | undefined; // NEW: dateRange prop
}

const LiveInformationAreaChartCard: React.FC<LiveInformationAreaChartCardProps> = ({ dateRange }) => { // NEW: Destructure dateRange
  const { orders } = useOrders();
  const { stockMovements } = useStockMovement();

  const data = useMemo(() => {
    const dataPoints = [];
    const today = new Date();

    // Determine effective date range for filtering
    const filterFrom = (dateRange?.from && isValid(dateRange.from)) ? startOfDay(dateRange.from) : subDays(startOfDay(today), 6);
    const filterTo = (dateRange?.to && isValid(dateRange.to)) ? endOfDay(dateRange.to) : ((dateRange?.from && isValid(dateRange.from)) ? endOfDay(dateRange.from) : endOfDay(today));

    let startDate = filterFrom;
    let endDate = filterTo;

    if (startDate.getTime() > endDate.getTime()) {
      [startDate, endDate] = [endDate, startDate];
    }

    const dailyMetrics: { [key: string]: { salesVolume: number; purchaseVolume: number; adjustments: number } } = {};

    let currentDate = new Date(startDate);
    while (currentDate.getTime() <= endDate.getTime()) {
      const dateKey = format(currentDate, "MMM dd");
      dailyMetrics[dateKey] = { salesVolume: 0, purchaseVolume: 0, adjustments: 0 };
      currentDate = subDays(currentDate, -1);
    }

    orders.forEach(order => {
      const orderDate = parseAndValidateDate(order.date); // NEW: Use parseAndValidateDate
      if (!orderDate || !isValid(orderDate)) return; // Ensure valid date
      const dateKey = format(orderDate, "MMM dd");
      if (dailyMetrics[dateKey] && isWithinInterval(orderDate, { start: startDate, end: endDate })) {
        if (order.type === "Sales") {
          dailyMetrics[dateKey].salesVolume += order.itemCount;
        } else if (order.type === "Purchase") {
          dailyMetrics[dateKey].purchaseVolume += order.itemCount;
        }
      }
    });

    stockMovements.forEach(movement => {
      const moveDate = parseAndValidateDate(movement.timestamp); // NEW: Use parseAndValidateDate
      if (!moveDate || !isValid(moveDate)) return; // Ensure valid date
      const dateKey = format(moveDate, "MMM dd");
      if (dailyMetrics[dateKey] && isWithinInterval(moveDate, { start: startDate, end: endDate })) {
        dailyMetrics[dateKey].adjustments += movement.amount;
      }
    });

    return Object.keys(dailyMetrics).sort((a, b) => {
      const dateA = parseAndValidateDate(a); // NEW: Use parseAndValidateDate
      const dateB = parseAndValidateDate(b); // NEW: Use parseAndValidateDate
      if (!dateA || !dateB || !isValid(dateA) || !isValid(dateB)) return 0; // Ensure valid dates
      return dateA.getTime() - dateB.getTime();
    }).map(dateKey => {
      const totalDailyActivity = dailyMetrics[dateKey].salesVolume + dailyMetrics[dateKey].purchaseVolume + dailyMetrics[dateKey].adjustments;
      return {
        name: dateKey,
        "Total Daily Activity": totalDailyActivity,
      };
    });
  }, [orders, stockMovements, dateRange]); // NEW: Added dateRange to dependencies

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4 flex flex-col h-[310px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold text-foreground">Total Daily Activity</CardTitle>
        <p className="text-sm text-muted-foreground">Overall inventory movement in real-time</p>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0 flex flex-col justify-between">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 10,
              right: 0,
              left: 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="strokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0088FE" />
                <stop offset="100%" stopColor="#00C49F" />
              </linearGradient>
              <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00C49F" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#0088FE" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: "0.75rem",
              }}
              itemStyle={{ color: "hsl(var(--foreground))", fontSize: "0.75rem" }}
              labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: "0.75rem" }}
              formatter={(value: number) => value.toLocaleString('en-US')}
            />
            <Area
              type="monotone"
              dataKey="Total Daily Activity"
              stroke="url(#strokeGradient)"
              fill="url(#fillGradient)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default LiveInformationAreaChartCard;