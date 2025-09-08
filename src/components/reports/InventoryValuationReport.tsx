import React, { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRange } from "react-day-picker";
import { useInventory, InventoryItem } from "@/context/InventoryContext";
import { useCategories } from "@/context/CategoryContext";
import { useOnboarding } from "@/context/OnboardingContext"; // Now contains Location[]
import { format, isWithinInterval, startOfDay, endOfDay, isValid } from "date-fns";
import { Loader2, DollarSign, Package, MapPin, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label"; // Added Label import
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

interface InventoryValuationReportProps {
  dateRange: DateRange | undefined; // NEW: dateRange prop
  onGenerateReport: (data: { pdfProps: any; printType: string }) => void;
  isLoading: boolean;
  reportContentRef: React.RefObject<HTMLDivElement>;
}

const InventoryValuationReport: React.FC<InventoryValuationReportProps> = ({
  dateRange, // NEW: Destructure dateRange prop
  onGenerateReport,
  isLoading,
  reportContentRef,
}) => {
  const { inventoryItems } = useInventory();
  const { categories } = useCategories();
  const { locations: structuredLocations } = useOnboarding(); // NEW: Get structured locations
  const { companyProfile } = useOnboarding();

  const [groupBy, setGroupBy] = useState<"category" | "location">("category");
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

    let groupedData: { name: string; totalValue: number; totalQuantity: number }[] = [];
    let totalOverallValue = 0;
    let totalOverallQuantity = 0;

    if (groupBy === "category") {
      const categoryMap: { [key: string]: { totalValue: number; totalQuantity: number } } = {};
      filteredItems.forEach(item => {
        if (!categoryMap[item.category]) {
          categoryMap[item.category] = { totalValue: 0, totalQuantity: 0 };
        }
        categoryMap[item.category].totalValue += item.quantity * item.unitCost;
        categoryMap[item.category].totalQuantity += item.quantity;
        totalOverallValue += item.quantity * item.unitCost;
        totalOverallQuantity += item.quantity;
      });
      groupedData = Object.entries(categoryMap).map(([name, data]) => ({
        name,
        totalValue: data.totalValue,
        totalQuantity: data.totalQuantity,
      })).sort((a, b) => b.totalValue - a.totalValue);
    } else { // groupBy === "location"
      const locationMap: { [key: string]: { totalValue: number; totalQuantity: number, displayName: string } } = {};
      filteredItems.forEach(item => {
        // Use the fullLocationString as the key, but display the displayName if available
        const locationKey = item.location;
        const display = structuredLocations.find(loc => loc.fullLocationString === locationKey)?.displayName || locationKey;

        if (!locationMap[locationKey]) {
          locationMap[locationKey] = { totalValue: 0, totalQuantity: 0, displayName: display };
        }
        locationMap[locationKey].totalValue += item.quantity * item.unitCost;
        locationMap[locationKey].totalQuantity += item.quantity;
        totalOverallValue += item.quantity * item.unitCost;
        totalOverallQuantity += item.quantity;
      });
      groupedData = Object.entries(locationMap).map(([key, data]) => ({
        name: data.displayName, // Use displayName for the report
        totalValue: data.totalValue,
        totalQuantity: data.totalQuantity,
      })).sort((a, b) => b.totalValue - a.totalValue);
    }

    const reportProps = {
      companyName: companyProfile?.name || "Fortress Inventory",
      companyAddress: companyProfile?.address || "N/A",
      companyContact: companyProfile?.currency || "N/A",
      companyLogoUrl: localStorage.getItem("companyLogo") || undefined,
      reportDate: format(new Date(), "MMM dd, yyyy HH:mm"),
      groupedData,
      groupBy,
      totalOverallValue,
      totalOverallQuantity,
      dateRange, // NEW: Pass dateRange to reportProps
    };

    setCurrentReportData(reportProps);
    onGenerateReport({ pdfProps: reportProps, printType: "inventory-valuation-report" });
    setReportGenerated(true);
  }, [inventoryItems, categories, structuredLocations, groupBy, companyProfile, onGenerateReport, dateRange]); // NEW: Added dateRange to dependencies

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

  const { groupedData, totalOverallValue, totalOverallQuantity } = currentReportData;

  return (
    <div ref={reportContentRef} className="space-y-6">
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-500" /> Inventory Valuation Report
          </CardTitle>
          <p className="text-muted-foreground">
            Current value of your inventory, grouped by {groupBy}.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="groupBy">Group By:</Label>
            <Select value={groupBy} onValueChange={(value: "category" | "location") => setGroupBy(value)}>
              <SelectTrigger id="groupBy" className="w-[180px]">
                <SelectValue placeholder="Group By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="location">Location</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generateReport}>Refresh Report</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Inventory Value</h3>
              <p className="text-3xl font-bold text-green-500">${totalOverallValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Total Units On Hand</h3>
              <p className="text-3xl font-bold">{totalOverallQuantity.toLocaleString()}</p>
            </div>
          </div>

          <h3 className="font-semibold text-xl mt-6">Details by {groupBy === "category" ? "Category" : "Location"}</h3>
          {groupedData.length > 0 ? (
            <ScrollArea className="h-[300px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{groupBy === "category" ? "Category" : "Location"}</TableHead>
                    <TableHead className="text-right">Total Quantity</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedData.map((data, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{data.name}</TableCell>
                      <TableCell className="text-right">{data.totalQuantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${data.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-8">No inventory data found for the selected criteria.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryValuationReport;