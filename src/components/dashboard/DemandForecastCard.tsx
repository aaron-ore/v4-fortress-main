import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Lightbulb } from "lucide-react";
import { useOrders } from "@/context/OrdersContext";
import { format, subMonths, isValid } from "date-fns";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

const DemandForecastCard: React.FC = () => {
  const { orders } = useOrders();

  const forecastData = useMemo(() => {
    const dataPoints = [];
    const today = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Aggregate historical sales data by month for the last 6 months
    const historicalSales: { [key: string]: number } = {};
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(today, i);
      const monthKey = format(month, "MMM yyyy");
      historicalSales[monthKey] = 0;
    }

    orders.filter(order => order.type === "Sales").forEach(order => {
      const orderDate = parseAndValidateDate(order.date);
      if (!orderDate || !isValid(orderDate)) return; // Ensure valid date
      const monthKey = format(orderDate, "MMM yyyy");
      if (historicalSales.hasOwnProperty(monthKey)) {
        historicalSales[monthKey] += order.totalAmount;
      }
    });

    // Prepare data for the chart: last 6 months historical + next 3 months forecast
    const chartData = [];
    const historicalKeys = Object.keys(historicalSales).sort((a, b) => {
      const dateA = parseAndValidateDate(a);
      const dateB = parseAndValidateDate(b);
      if (!dateA || !dateB) return 0; // Handle null dates
      return dateA.getTime() - dateB.getTime();
    });

    historicalKeys.forEach(monthKey => {
      chartData.push({
        name: format(parseAndValidateDate(monthKey) || new Date(), "MMM"),
        "Actual Sales": parseFloat(historicalSales[monthKey].toFixed(2)),
        "Projected Demand": null, // No projection for historical data
      });
    });

    // Simple projection for the next 3 months based on average of last 3 months
    const lastThreeMonthsSales = historicalKeys.slice(-3).map(key => historicalSales[key]);
    const averageSales = lastThreeMonthsSales.length > 0
      ? lastThreeMonthsSales.reduce((sum, val) => sum + val, 0) / lastThreeMonthsSales.length
      : 0;

    for (let i = 1; i <= 3; i++) {
      const futureMonth = subMonths(today, -i);
      const futureMonthName = format(futureMonth, "MMM");
      const projectedValue = averageSales > 0 ? Math.max(0, averageSales * (1 + (Math.random() - 0.5) * 0.1)) : 0; // +/- 5% fluctuation
      chartData.push({
        name: futureMonthName,
        "Actual Sales": null, // No actual sales for future
        "Projected Demand": parseFloat(projectedValue.toFixed(2)),
      });
    }

    return chartData;
  }, [orders]);

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm col-span-full p-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-foreground">Demand Forecast (Next 3 Months)</CardTitle>
        <TrendingUp className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent className="p-4 pt-0 flex flex-col justify-between h-full">
        {forecastData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={forecastData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" strokeOpacity={0.3} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
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
              <Line type="monotone" dataKey="Actual Sales" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="Projected Demand" stroke="hsl(var(--accent))" strokeDasharray="5 5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 bg-secondary rounded-md flex items-center justify-center text-muted-foreground">
            No sales data available to generate a forecast.
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-auto flex items-center gap-1 justify-center">
          <Lightbulb className="h-3 w-3 text-yellow-500" />
          <span className="font-semibold">Insight:</span> This basic forecast helps anticipate future demand. For advanced, AI-driven predictions and integration with purchasing, consider upgrading your plan.
        </p>
      </CardContent>
    </Card>
  );
};

export default DemandForecastCard;