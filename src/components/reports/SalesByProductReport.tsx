import React, { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRange } from "react-day-picker";
import { useOrders, OrderItem } from "@/context/OrdersContext";
import { useInventory } from "@/context/InventoryContext";
import { useCategories } from "@/context/CategoryContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { format, isWithinInterval, startOfDay, endOfDay, isValid } from "date-fns";
import { Loader2, Package, Receipt, BarChart, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

interface ProductSalesData {
  productName: string;
  sku: string;
  category: string;
  unitsSold: number;
  totalRevenue: number;
}

interface SalesByProductReportProps {
  dateRange: DateRange | undefined; // NEW: dateRange prop
  onGenerateReport: (data: { pdfProps: any; printType: string }) => void;
  isLoading: boolean;
  reportContentRef: React.RefObject<HTMLDivElement>;
}

const SalesByProductReport: React.FC<SalesByProductReportProps> = ({
  dateRange, // NEW: Destructure dateRange prop
  onGenerateReport,
  isLoading,
  reportContentRef,
}) => {
  const { orders } = useOrders();
  const { inventoryItems } = useInventory();
  const { categories } = useCategories();
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

    const productSalesMap: { [key: string]: { productName: string; sku: string; category: string; unitsSold: number; totalRevenue: number } } = {};

    filteredOrders.forEach(order => {
      order.items.forEach(orderItem => {
        const inventoryItem = inventoryItems.find(inv => inv.id === orderItem.inventoryItemId);
        const sku = inventoryItem?.sku || "N/A";
        const category = inventoryItem?.category || "Uncategorized";
        const productName = orderItem.itemName;

        if (!productSalesMap[sku]) {
          productSalesMap[sku] = { productName, sku, category, unitsSold: 0, totalRevenue: 0 };
        }
        productSalesMap[sku].unitsSold += orderItem.quantity;
        productSalesMap[sku].totalRevenue += orderItem.quantity * orderItem.unitPrice;
      });
    });

    const productSales: ProductSalesData[] = Object.values(productSalesMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

    const reportProps = {
      companyName: companyProfile?.name || "Fortress Inventory",
      companyAddress: companyProfile?.address || "N/A",
      companyContact: companyProfile?.currency || "N/A",
      companyLogoUrl: localStorage.getItem("companyLogo") || undefined,
      reportDate: format(new Date(), "MMM dd, yyyy HH:mm"),
      productSales,
      dateRange, // NEW: Pass dateRange to reportProps
    };

    setCurrentReportData(reportProps);
    onGenerateReport({ pdfProps: reportProps, printType: "sales-by-product-report" });
    setReportGenerated(true);
  }, [orders, inventoryItems, categories, companyProfile, onGenerateReport, dateRange]); // NEW: Added dateRange to dependencies

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

  const { productSales } = currentReportData;
  const totalOverallRevenue = productSales.reduce((sum, data) => sum + data.totalRevenue, 0);
  const totalOverallUnits = productSales.reduce((sum, data) => sum + data.unitsSold, 0);

  return (
    <div ref={reportContentRef} className="space-y-6">
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <BarChart className="h-6 w-6 text-primary" /> Sales by Product Report
          </CardTitle>
          <p className="text-muted-foreground">
            Overview of sales performance grouped by product.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={generateReport}>Refresh Report</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Sales Revenue</h3>
              <p className="text-3xl font-bold text-green-500">${totalOverallRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Units Sold</h3>
              <p className="text-3xl font-bold">{totalOverallUnits.toLocaleString()}</p>
            </div>
          </div>

          <h3 className="font-semibold text-xl mt-6">Detailed Sales by Product ({productSales.length})</h3>
          {productSales.length > 0 ? (
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Units Sold</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productSales.map((data, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{data.productName}</TableCell>
                      <TableCell>{data.sku}</TableCell>
                      <TableCell>{data.category}</TableCell>
                      <TableCell className="text-right">{data.unitsSold.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${data.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
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

export default SalesByProductReport;