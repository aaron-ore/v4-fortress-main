import React, { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRange } from "react-day-picker";
import { useOrders, OrderItem } from "@/context/OrdersContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { format, isWithinInterval, startOfDay, endOfDay, isValid } from "date-fns";
import { Loader2, Users, DollarSign, Receipt, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

interface CustomerSalesData {
  customerName: string;
  totalSales: number;
  totalItems: number;
  lastOrderDate: string;
}

interface SalesByCustomerReportProps {
  dateRange: DateRange | undefined; // NEW: dateRange prop
  onGenerateReport: (data: { pdfProps: any; printType: string }) => void;
  isLoading: boolean;
  reportContentRef: React.RefObject<HTMLDivElement>;
}

const SalesByCustomerReport: React.FC<SalesByCustomerReportProps> = ({
  dateRange, // NEW: Destructure dateRange prop
  onGenerateReport,
  isLoading,
  reportContentRef,
}) => {
  const { orders } = useOrders();
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

    const customerSalesMap: { [key: string]: { totalSales: number; totalItems: number; lastOrderDate: Date } } = {};

    filteredOrders.forEach(order => {
      if (!customerSalesMap[order.customerSupplier]) {
        customerSalesMap[order.customerSupplier] = { totalSales: 0, totalItems: 0, lastOrderDate: new Date(0) };
      }
      customerSalesMap[order.customerSupplier].totalSales += order.totalAmount;
      customerSalesMap[order.customerSupplier].totalItems += order.itemCount;
      const currentOrderDate = parseAndValidateDate(order.date); // NEW: Use parseAndValidateDate
      if (currentOrderDate && isValid(currentOrderDate) && currentOrderDate > customerSalesMap[order.customerSupplier].lastOrderDate) { // Ensure valid date
        customerSalesMap[order.customerSupplier].lastOrderDate = currentOrderDate;
      }
    });

    const customerSales: CustomerSalesData[] = Object.entries(customerSalesMap).map(([customerName, data]) => ({
      customerName,
      totalSales: data.totalSales,
      totalItems: data.totalItems,
      lastOrderDate: format(data.lastOrderDate, "MMM dd, yyyy"),
    })).sort((a, b) => b.totalSales - a.totalSales);

    const reportProps = {
      companyName: companyProfile?.name || "Fortress Inventory",
      companyAddress: companyProfile?.address || "N/A",
      companyContact: companyProfile?.currency || "N/A",
      companyLogoUrl: localStorage.getItem("companyLogo") || undefined,
      reportDate: format(new Date(), "MMM dd, yyyy HH:mm"),
      customerSales,
      dateRange, // NEW: Pass dateRange to reportProps
    };

    setCurrentReportData(reportProps);
    onGenerateReport({ pdfProps: reportProps, printType: "sales-by-customer-report" });
    setReportGenerated(true);
  }, [orders, companyProfile, onGenerateReport, dateRange]); // NEW: Added dateRange to dependencies

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

  const { customerSales } = currentReportData;
  const totalOverallSales = customerSales.reduce((sum, data) => sum + data.totalSales, 0);
  const totalOverallItems = customerSales.reduce((sum, data) => sum + data.totalItems, 0);

  return (
    <div ref={reportContentRef} className="space-y-6">
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Sales by Customer Report
          </CardTitle>
          <p className="text-muted-foreground">
            Overview of sales performance grouped by customer.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={generateReport}>Refresh Report</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Sales Revenue</h3>
              <p className="text-3xl font-bold text-green-500">${totalOverallSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Items Sold</h3>
              <p className="text-3xl font-bold">{totalOverallItems.toLocaleString()}</p>
            </div>
          </div>

          <h3 className="font-semibold text-xl mt-6">Detailed Sales by Customer ({customerSales.length})</h3>
          {customerSales.length > 0 ? (
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Total Items</TableHead>
                    <TableHead>Last Order Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerSales.map((data, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{data.customerName}</TableCell>
                      <TableCell className="text-right">${data.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">{data.totalItems.toLocaleString()}</TableCell>
                      <TableCell>{data.lastOrderDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-8">No sales data found for the selected criteria.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesByCustomerReport;