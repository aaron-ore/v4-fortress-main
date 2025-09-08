import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useOrders } from "@/context/OrdersContext";
import { format, subDays, isValid } from "date-fns"; // Import isValid
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

const WeeklyRevenueBarChart: React.FC = () => {
  const { orders } = useOrders();

  const weeklyData = useMemo(() => {
    const today = new Date();
    const dataPoints = [];

    // Initialize revenue for "This Week" and "Last Week" for each day
    const thisWeekRevenue: { [key: string]: number } = {};
    const lastWeekRevenue: { [key: string]: number } = {};

    // Populate "This Week" revenue from actual sales orders
    orders.filter(order => order.type === "Sales").forEach(order => {
      const orderDate = parseAndValidateDate(order.date);
      if (!orderDate || !isValid(orderDate)) return; // Ensure valid date

      const diffDays = Math.floor((today.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays < 7) { // This week (0-6 days ago)
        const dayName = format(orderDate, "E"); // Mon, Tue, etc.
        thisWeekRevenue[dayName] = (thisWeekRevenue[dayName] || 0) + order.totalAmount;
      } else if (diffDays >= 7 && diffDays < 14) { // Last week (7-13 days ago)
        const dayName = format(orderDate, "E");
        lastWeekRevenue[dayName] = (lastWeekRevenue[dayName] || 0) + order.totalAmount;
      }
    });

    // Generate data for the last 7 days (Mon-Sun or current day backwards)
    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const currentDayIndex = today.getDay(); // 0 for Sun, 1 for Mon

    for (let i = 0; i < 7; i++) {
      const dayIndex = (currentDayIndex + i) % 7; // Start from current day, wrap around
      const dayName = daysOfWeek[dayIndex];

      const thisWeekVal = thisWeekRevenue[dayName] || 0;
      const lastWeekVal = lastWeekRevenue[dayName] || 0;

      dataPoints.push({
        name: dayName,
        "This Week": parseFloat(thisWeekVal.toFixed(2)),
        "Last Week": parseFloat(lastWeekVal.toFixed(2)),
      });
    }

    return dataPoints;
  }, [orders]);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart
        data={weeklyData}
        margin={{
          top: 5,
          right: 10,
          left: 10,
          bottom: 5,
        }}
        barCategoryGap="20%" // Keep this for bar spacing
        barGap={0} // Ensure no gap between bars of the same category
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" strokeOpacity={0.3} vertical={false} />
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          interval={0} // Ensure all labels are shown
          tickLine={false} // Hide tick lines for cleaner look
          axisLine={false} // Hide axis line
          tickMargin={10} // Add margin between labels and bars
        />
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
        <Bar dataKey="This Week" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Last Week" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default WeeklyRevenueBarChart;