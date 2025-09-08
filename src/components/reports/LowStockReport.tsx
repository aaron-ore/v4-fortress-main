import React, { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRange } from "react-day-picker";
import { useInventory, InventoryItem } from "@/context/InventoryContext";
import { useOnboarding } from "@/context/OnboardingContext"; // Now contains Location[]
import { format, isWithinInterval, startOfDay, endOfDay, isValid } from "date-fns";
import { Loader2, AlertTriangle, Package, MapPin, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label"; // Added Label import
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

interface LowStockReportProps {
  dateRange: DateRange | undefined; // NEW: dateRange prop
  onGenerateReport: (data: { pdfProps: any; printType: string }) => void;
  isLoading: boolean;
  reportContentRef: React.RefObject<HTMLDivElement>;
}

const LowStockReport: React.FC<LowStockReportProps> = ({
  dateRange, // NEW: Destructure dateRange prop
  onGenerateReport,
  isLoading,
  reportContentRef,
}) => {
  const { inventoryItems } = useInventory();
  const { locations: structuredLocations } = useOnboarding(); // NEW: Get structured locations
  const { companyProfile } = useOnboarding();

  const [statusFilter, setStatusFilter] = useState<"all" | "low-stock" | "out-of-stock">("all");
  const [reportGenerated, setReportGenerated] = useState(false);
  const [currentReportData, setCurrentReportData] = useState<any>(null);

  const generateReport = useCallback(() => {
    const filterFrom = (dateRange?.from && isValid(dateRange.from)) ? startOfDay(dateRange.from) : null;
    const filterTo = (dateRange?.to && isValid(dateRange.to)) ? endOfDay(dateRange.to) : ((dateRange?.from && isValid(dateRange.from)) ? endOfDay(dateRange.from) : null);

    const filteredItems = inventoryItems.filter(item => {
      const itemLastUpdated = parseAndValidateDate(item.lastUpdated);
      if (!itemLastUpdated || !isValid(itemLastUpdated)) return false; // Ensure valid date
      if (filterFrom && filterTo) {
        return isWithinInterval(itemLastUpdated, { start: filterFrom, end: filterTo });
      }
      return true;
    });

    let itemsToDisplay: InventoryItem[] = [];

    if (statusFilter === "low-stock") {
      itemsToDisplay = filteredItems.filter(item => item.quantity > 0 && item.quantity <= item.reorderLevel);
    } else if (statusFilter === "out-of-stock") {
      itemsToDisplay = filteredItems.filter(item => item.quantity === 0);
    } else { // "all"
      itemsToDisplay = filteredItems.filter(item => item.quantity <= item.reorderLevel);
    }

    const reportProps = {
      companyName: companyProfile?.name || "Fort Fortress Inventory",
      companyAddress: companyProfile?.address || "N/A",
      companyContact: companyProfile?.currency || "N/A",
      companyLogoUrl: localStorage.getItem("companyLogo") || undefined,
      reportDate: format(new Date(), "MMM dd, yyyy HH:mm"),
      items: itemsToDisplay,
      statusFilter,
      dateRange, // NEW: Pass dateRange to reportProps
      structuredLocations, // NEW: Pass structuredLocations to resolve display names
    };

    setCurrentReportData(reportProps);
    onGenerateReport({ pdfProps: reportProps, printType: "low-stock-report" });
    setReportGenerated(true);
  }, [inventoryItems, structuredLocations, statusFilter, companyProfile, onGenerateReport, dateRange]); // NEW: Added dateRange to dependencies

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

  const { items: itemsToDisplay, statusFilter: currentStatusFilter } = currentReportData;

  return (
    <div ref={reportContentRef} className="space-y-6">
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" /> Low Stock / Out of Stock Report
          </CardTitle>
          <p className="text-muted-foreground">
            Items currently below reorder level or out of stock.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="statusFilter">Filter Status:</Label>
            <Select value={statusFilter} onValueChange={(value: "all" | "low-stock" | "out-of-stock") => setStatusFilter(value)}>
              <SelectTrigger id="statusFilter" className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Low/Out of Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock Only</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock Only</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generateReport}>Refresh Report</Button>
          </div>

          <h3 className="font-semibold text-xl mt-6">
            {currentStatusFilter === "low-stock" ? "Low Stock Items" :
             currentStatusFilter === "out-of-stock" ? "Out of Stock Items" :
             "Low & Out of Stock Items"} ({itemsToDisplay.length})
          </h3>
          {itemsToDisplay.length > 0 ? (
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Reorder Level</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsToDisplay.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell className="text-right text-destructive">{item.quantity}</TableCell>
                      <TableCell className="text-right">{item.reorderLevel}</TableCell>
                      <TableCell>{structuredLocations.find(loc => loc.fullLocationString === item.location)?.displayName || item.location}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-8">No items found for the selected criteria. Great job!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LowStockReport;