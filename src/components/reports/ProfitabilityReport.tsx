import React, { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRange } from "react-day-picker";
import { useOrders } from "@/context/OrdersContext";
import { useInventory } from "@/context/InventoryContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { format, isWithinInterval, startOfDay, endOfDay, isValid } from "date-fns";
import { Loader2, DollarSign, BarChart, FileText } from "lucide-react"; // NEW: Import FileText
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

interface ProfitabilityMetricsData {
  name: string;
  value: number;
  color: string;
}

interface ProfitabilityReportProps {
  dateRange: DateRange | undefined; // NEW: dateRange prop
  onGenerateReport: (data: { pdfProps: any; printType: string }) => void;
  isLoading: boolean;
  reportContentRef: React.RefObject<HTMLDivElement>;
}

const ProfitabilityReport: React.FC<ProfitabilityReportProps> = ({
  dateRange, // NEW: Destructure dateRange prop
  onGenerateReport,
  isLoading,
  reportContentRef,
}) => {
  const { orders } = useOrders();
  const { inventoryItems } = useInventory();
  const { companyProfile } = useOnboarding();

  const [reportGenerated, setReportGenerated] = useState(false);
  const [currentReportData, setCurrentReportData] = useState<any>(null);

  const generateReport = useCallback(() => {
    const filterFrom = (dateRange?.from && isValid(dateRange.from)) ? startOfDay(dateRange.from) : null;
    const filterTo = (dateRange?.to && isValid(dateRange.to)) ? endOfDay(dateRange.to) : ((dateRange?.from && isValid(dateRange.from)) ? endOfDay(dateRange.from) : null);

    const filteredOrders = orders.filter(order => {
      if (order.type !== "Sales") return false;
      const orderDate = parseAndValidateDate(order.date);
      if (!orderDate || !isValid(orderDate)) return false; // Ensure valid date
      if (filterFrom && filterTo) {
        return isWithinInterval(orderDate, { start: filterFrom, end: filterTo });
      }
      return true;
    });

    let totalSalesRevenue = 0;
    let totalCostOfGoodsSold = 0;

    filteredOrders.forEach(order => {
      totalSalesRevenue += order.totalAmount;
      order.items.forEach(orderItem => {
        const inventoryItem = inventoryItems.find(inv => inv.id === orderItem.inventoryItemId);
        if (inventoryItem) {
          totalCostOfGoodsSold += orderItem.quantity * inventoryItem.unitCost;
        } else {
          totalCostOfGoodsSold += orderItem.quantity * orderItem.unitPrice * 0.7;
        }
      });
    });

    const grossProfit = totalSalesRevenue - totalCostOfGoodsSold;
    const grossProfitMargin = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;

    const simulatedOperatingExpenses = totalSalesRevenue * 0.20;
    const netProfit = grossProfit - simulatedOperatingExpenses;
    const netProfitMargin = totalSalesRevenue > 0 ? (netProfit / totalSalesRevenue) * 100 : 0;

    const simulatedLossesPercentage = totalSalesRevenue > 0 ? (totalSalesRevenue * 0.05 / totalSalesRevenue) * 100 : 0;

    const metricsData: ProfitabilityMetricsData[] = [
      { name: "Gross Margin", value: parseFloat(grossProfitMargin.toFixed(0)), color: "#00BFD8" },
      { name: "Net Margin", value: parseFloat(netProfitMargin.toFixed(0)), color: "#00C49F" },
      { name: "Simulated Losses", value: parseFloat(simulatedLossesPercentage.toFixed(0)), color: "#0088FE" },
    ];

    const reportProps = {
      companyName: companyProfile?.name || "Fortress Inventory",
      companyAddress: companyProfile?.address || "N/A",
      companyContact: companyProfile?.currency || "N/A",
      companyLogoUrl: localStorage.getItem("companyLogo") || undefined,
      reportDate: format(new Date(), "MMM dd, yyyy HH:mm"),
      metricsData,
      totalSalesRevenue,
      totalCostOfGoodsSold,
      dateRange, // NEW: Pass dateRange to reportProps
    };

    setCurrentReportData(reportProps);
    onGenerateReport({ pdfProps: reportProps, printType: "profitability-report" });
    setReportGenerated(true);
  }, [orders, inventoryItems, companyProfile, onGenerateReport, dateRange]); // NEW: Added dateRange to dependencies

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Generating report...</span>
      </div>
    );
  }

  if (!reportGenerated || !currentReportData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <FileText className="h-16 w-16 mb-4" />
        <p className="text-lg">Configure filters and click "Generate Report".</p>
        <Button onClick={generateReport} className="mt-4">Generate Report</Button>
      </div>
    );
  }

  const { metricsData, totalSalesRevenue, totalCostOfGoodsSold } = currentReportData;
  const grossProfit = totalSalesRevenue - totalCostOfGoodsSold;

  return (
    <div ref={reportContentRef} className="space-y-6">
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <BarChart className="h-6 w-6 text-primary" /> Profitability Report
          </CardTitle>
          <p className="text-muted-foreground">
            Key financial performance indicators for sales.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={generateReport}>Refresh Report</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Sales Revenue</h3>
              <p className="text-3xl font-bold text-green-500">${totalSalesRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Cost of Goods Sold</h3>
              <p className="text-3xl font-bold">${totalCostOfGoodsSold.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Gross Profit</h3>
              <p className="text-3xl font-bold">${grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          <h3 className="font-semibold text-xl mt-6">Profitability Metrics</h3>
          {metricsData.length > 0 ? (
            <ScrollArea className="h-[200px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">Value (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metricsData.map((metric, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{metric.name}</TableCell>
                      <TableCell className="text-right">{metric.value.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-8">No profitability metrics available for the selected criteria.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitabilityReport;