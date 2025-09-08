import React, { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRange } from "react-day-picker";
import { useStockMovement, StockMovement } from "@/context/StockMovementContext";
import { useOnboarding } from "@/context/OnboardingContext"; // Now contains Location[]
import { useProfile } from "@/context/ProfileContext";
import { format, isWithinInterval, startOfDay, endOfDay, isValid } from "date-fns";
import { Loader2, Scale, User, Clock, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label"; // Added Label import
import { showError } from "@/utils/toast";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

interface InventoryMovementReportProps {
  dateRange: DateRange | undefined; // NEW: dateRange prop
  onGenerateReport: (data: { pdfProps: any; printType: string }) => void;
  isLoading: boolean;
  reportContentRef: React.RefObject<HTMLDivElement>;
}

const InventoryMovementReport: React.FC<InventoryMovementReportProps> = ({
  dateRange, // NEW: Destructure dateRange prop
  onGenerateReport,
  isLoading,
  reportContentRef,
}) => {
  const { stockMovements, fetchStockMovements } = useStockMovement();
  const { companyProfile } = useOnboarding();
  const { allProfiles, fetchAllProfiles } = useProfile();
  const { locations: structuredLocations } = useOnboarding(); // NEW: Get structured locations

  const [reportGenerated, setReportGenerated] = useState(false);
  const [currentReportData, setCurrentReportData] = useState<any>(null);
  const [movementTypeFilter, setMovementTypeFilter] = useState<"all" | "add" | "subtract">("all");

  const generateReport = useCallback(async () => {
    await fetchStockMovements(); // Ensure latest movements are fetched
    await fetchAllProfiles(); // Ensure user profiles are loaded for names

    const filterFrom = (dateRange?.from && isValid(dateRange.from)) ? startOfDay(dateRange.from) : null;
    const filterTo = (dateRange?.to && isValid(dateRange.to)) ? endOfDay(dateRange.to) : ((dateRange?.from && isValid(dateRange.from)) ? endOfDay(dateRange.from) : null);

    const filteredMovements = stockMovements.filter(movement => {
      if (movementTypeFilter !== "all" && movement.type !== movementTypeFilter) {
        return false;
      }
      const movementTimestamp = parseAndValidateDate(movement.timestamp);
      if (!movementTimestamp || !isValid(movementTimestamp)) return false; // Ensure valid date
      if (filterFrom && filterTo) {
        return isWithinInterval(movementTimestamp, { start: filterFrom, end: filterTo });
      }
      return true;
    });

    const reportProps = {
      companyName: companyProfile?.name || "Fortress Inventory",
      companyAddress: companyProfile?.address || "N/A",
      companyContact: companyProfile?.currency || "N/A",
      companyLogoUrl: localStorage.getItem("companyLogo") || undefined,
      reportDate: format(new Date(), "MMM dd, yyyy HH:mm"),
      movements: filteredMovements,
      dateRange, // NEW: Pass dateRange to reportProps
      allProfiles,
      structuredLocations, // NEW: Pass structuredLocations to resolve display names
    };

    setCurrentReportData(reportProps);
    onGenerateReport({ pdfProps: reportProps, printType: "inventory-movement-report" });
    setReportGenerated(true);
  }, [stockMovements, movementTypeFilter, companyProfile, onGenerateReport, allProfiles, fetchStockMovements, fetchAllProfiles, dateRange, structuredLocations]); // NEW: Added dateRange to dependencies

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  const getUserName = (userId: string) => {
    const user = allProfiles.find(p => p.id === userId);
    return user?.fullName || user?.email || "Unknown User";
  };

  const getLocationDisplayName = (fullLocationString: string) => {
    const foundLoc = structuredLocations.find(loc => loc.fullLocationString === fullLocationString);
    return foundLoc?.displayName || fullLocationString;
  };

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

  const { movements: movementsToDisplay } = currentReportData;

  return (
    <div ref={reportContentRef} className="space-y-6">
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" /> Inventory Movement Report
          </CardTitle>
          <p className="text-muted-foreground">
            Detailed log of all stock changes within the selected period.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="movementTypeFilter">Filter by Type:</Label>
            <Select value={movementTypeFilter} onValueChange={(value: "all" | "add" | "subtract") => setMovementTypeFilter(value)}>
              <SelectTrigger id="movementTypeFilter" className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="add">Additions</SelectItem>
                <SelectItem value="subtract">Subtractions</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generateReport}>Refresh Report</Button>
          </div>

          <h3 className="font-semibold text-xl mt-6">
            {movementTypeFilter === "add" ? "Stock Additions" :
             movementTypeFilter === "subtract" ? "Stock Subtractions" :
             "All Stock Movements"} ({movementsToDisplay.length})
          </h3>
          {movementsToDisplay.length > 0 ? (
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Old Qty</TableHead>
                    <TableHead className="text-right">New Qty</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movementsToDisplay.map((movement) => {
                    const movementTimestamp = parseAndValidateDate(movement.timestamp);
                    return (
                      <TableRow key={movement.id}>
                        <TableCell className="font-medium">{movement.itemName}</TableCell>
                        <TableCell>{movement.type}</TableCell>
                        <TableCell className="text-right">{movement.amount}</TableCell>
                        <TableCell className="text-right">{movement.oldQuantity}</TableCell>
                        <TableCell className="text-right">{movement.newQuantity}</TableCell>
                        <TableCell>{movement.reason}</TableCell>
                        <TableCell>{getUserName(movement.userId)}</TableCell>
                        <TableCell>{movementTimestamp ? format(movementTimestamp, "MMM dd, HH:mm") : "N/A"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-8">No inventory movements found for the selected criteria.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryMovementReport;