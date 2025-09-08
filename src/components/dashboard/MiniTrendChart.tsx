import React from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  CartesianGrid,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

interface MiniTrendChartProps {
  data: { name: string; value: number }[];
  dataKey: string;
  color?: string;
  className?: string;
  valueFormatter?: (value: number) => string;
}

const MiniTrendChart: React.FC<MiniTrendChartProps> = ({
  data,
  dataKey,
  color = "hsl(var(--primary))",
  className,
  valueFormatter = (value) => value.toFixed(0),
}) => {
  const maxDataValue = Math.max(...data.map(d => d.value));
  const roundedMax = Math.ceil(maxDataValue / 500) * 500;
  // const yAxisTicks = Array.from({ length: roundedMax / 500 + 1 }, (_, i) => i * 500); // Removed for now

  return (
    <ResponsiveContainer width="100%" height={150} className={cn(className)}>
      <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 15 }}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" strokeOpacity={0.3} vertical={false} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          interval="preserveStartEnd"
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          domain={[0, roundedMax]}
          // ticks={yAxisTicks} // Removed for now
          tickFormatter={(value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          tickLine={false}
          axisLine={false}
          width={40}
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
          formatter={(value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          fill="url(#colorValue)"
          strokeWidth={3}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default MiniTrendChart;