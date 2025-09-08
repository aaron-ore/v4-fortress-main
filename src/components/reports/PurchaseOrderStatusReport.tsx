import React, { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRange } from "react-day-picker";
import { useOrders, OrderItem } from "@/context/OrdersContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { format, isWithinInterval, startOfDay, endOfDay, isValid } from "date-fns";
import { Loader2, FileText, Truck, DollarSign } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label"; // Added Label import
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

interface PurchaseOrderStatusReportProps {
  dateRange: DateRange | undefined; // NEW: dateRange prop
  onGenerateReport: (data: { pdfProps: any; printType: string }) => void;
  isLoading: boolean;
  reportContentRef: React.RefObject<HTMLDivElement>;
}

const PurchaseOrderStatusReport: React.FC<PurchaseOrderStatusReportProps> = ({
  dateRange, // NEW: Destructure dateRange prop
  onGenerateReport,
  isLoading,
  reportContentRef,
}) => {
  const { orders } = useOrders();
  const { companyProfile } = useOnboarding();

  const [statusFilter, setStatusFilter] = useState<"all" | "new-order" | "processing" | "packed" | "shipped" | "on-hold-problem" | "archived">("all");
  const [reportGenerated, setReportGenerated] = useState(false);
  const [currentReportData, setCurrentReportData] = useState<any>(null);

  const generateReport = useCallback(() => {
    const filterFrom = (dateRange?.from && isValid(dateRange.from)) ? startOfDay(dateRange.from) : null;
    const filterTo = (dateRange?.to && isValid(dateRange.to)) ? endOfDay(dateRange.to) : ((dateRange?.from && isValid(dateRange.from)) ? endOfDay(dateRange.from) : null);

    const filteredOrders = orders.filter(order => {
      if (order.type !== "Purchase") return false;
      if (statusFilter !== "all" && order.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      const orderDate = parseAndValidateDate(order.date);
      if (!orderDate || !isValid(orderDate)) return false; // Ensure valid date
      if (filterFrom && filterTo) {
        return isWithinInterval(orderDate, { start: filterFrom, end: filterTo });
      }
      return true;
    });

    const reportProps = {
      companyName: companyProfile?.name || "Fortress Inventory",
      companyAddress: companyProfile?.address || "N/A",
      companyContact: companyProfile?.currency || "N/A",
      companyLogoUrl: localStorage.getItem("companyLogo") || undefined,
      reportDate: format(new Date(), "MMM dd, yyyy HH:mm"),
      orders: filteredOrders,
      statusFilter,
      dateRange, // NEW: Pass dateRange to reportProps
    };

    setCurrentReportData(reportProps);
    onGenerateReport({ pdfProps: reportProps, printType: "purchase-order-status-report" });
    setReportGenerated(true);
  }, [orders, statusFilter, companyProfile, onGenerateReport, dateRange]); // NEW: Added dateRange to dependencies

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

  const { orders: ordersToDisplay, statusFilter: currentStatusFilter } = currentReportData;
  const totalOrders = ordersToDisplay.length;
  const totalAmount = ordersToDisplay.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <div ref={reportContentRef} className="space-y-6">
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Purchase Order Status Report
          </CardTitle>
          <p className="text-muted-foreground">
            Overview of all purchase orders and their current statuses.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="statusFilter">Filter Status:</Label>
            <Select value={statusFilter} onValueChange={(value: "all" | "new-order" | "processing" | "packed" | "shipped" | "on-hold-problem" | "archived") => setStatusFilter(value)}>
              <SelectTrigger id="statusFilter" className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new-order">New Order</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="packed">Packed</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="on-hold-problem">On Hold / Problem</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generateReport}>Refresh Report</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Purchase Orders</h3>
              <p className="text-3xl font-bold">{totalOrders.toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Value of Orders</h3>
              <p className="text-3xl font-bold">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          <h3 className="font-semibold text-xl mt-6">
            Detailed Purchase Orders ({ordersToDisplay.length})
          </h3>
          {ordersToDisplay.length > 0 ? (
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersToDisplay.map((order) => {
                    const orderDate = parseAndValidateDate(order.date);
                    const dueDate = parseAndValidateDate(order.dueDate);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell>{order.customerSupplier}</TableCell>
                        <TableCell>{orderDate ? format(orderDate, "MMM dd, yyyy") : "N/A"}</TableCell>
                        <TableCell>{dueDate ? format(dueDate, "MMM dd, yyyy") : "N/A"}</TableCell>
                        <TableCell>{order.status}</TableCell>
                        <TableCell className="text-right">${order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-8">No purchase orders found for the selected criteria.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseOrderStatusReport;