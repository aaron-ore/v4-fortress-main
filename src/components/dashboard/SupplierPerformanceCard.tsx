import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge } from "lucide-react";

interface SupplierPerformanceCardProps {
  score: "good" | "average" | "bad";
}

const SupplierPerformanceCard: React.FC<SupplierPerformanceCardProps> = ({ score }) => {
  const scoreColor = {
    good: "text-green-500",
    average: "text-yellow-500",
    bad: "text-red-500",
  };

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-foreground">Supplier Performance Score</CardTitle>
        <Gauge className={`h-4 w-4 ${scoreColor[score]}`} />
      </CardHeader>
      <CardContent className="text-center p-4 pt-0 flex flex-col justify-between h-full">
        <div className={`text-2xl font-bold ${scoreColor[score]}`}>
          {score.charAt(0).toUpperCase() + score.slice(1)}
        </div>
        <p className="text-xs text-muted-foreground mt-auto">Delivery timeliness, defect rates, and pricing consistency.</p>
        <p className="text-xs text-muted-foreground">Visual scorecard: Green (good), Yellow (average), Red (bad).</p>
      </CardContent>
    </Card>
  );
};

export default SupplierPerformanceCard;