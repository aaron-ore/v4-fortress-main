import React, { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRange } from "react-day-picker";
import { useProfile } from "@/context/ProfileContext";
import { useOnboarding } from "@/context/OnboardingContext"; // Now contains Location[]
import { supabase } from "@/lib/supabaseClient";
import { format, isWithinInterval, startOfDay, endOfDay, isValid } from "date-fns";
import { Loader2, AlertTriangle, Scale, User, Clock, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label"; // Added Label import
import { showError } from "@/utils/toast";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

interface DiscrepancyLog {
  id: string;
  timestamp: string;
  userId: string;
  organizationId: string;
  itemId: string;
  itemName: string;
  locationString: string; // This is the fullLocationString
  locationType: string;
  originalQuantity: number;
  countedQuantity: number;
  difference: number;
  reason: string;
  status: string;
}

interface DiscrepancyReportProps {
  dateRange: DateRange | undefined; // NEW: dateRange prop
  onGenerateReport: (data: { pdfProps: any; printType: string }) => void;
  isLoading: boolean;
  reportContentRef: React.RefObject<HTMLDivElement>;
}

const DiscrepancyReport: React.FC<DiscrepancyReportProps> = ({
  dateRange, // NEW: Destructure dateRange prop
  onGenerateReport,
  isLoading,
  reportContentRef,
}) => {
  const { profile, allProfiles, fetchAllProfiles } = useProfile();
  const { locations: structuredLocations } = useOnboarding(); // NEW: Get structured locations
  const { companyProfile } = useOnboarding();

  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "resolved">("all");
  const [reportGenerated, setReportGenerated] = useState(false);
  const [currentReportData, setCurrentReportData] = useState<any>(null);

  const fetchDiscrepancies = useCallback(async () => {
    if (!profile?.organizationId) {
      return [];
    }

    let query = supabase
      .from('discrepancies')
      .select('*')
      .eq('organization_id', profile.organizationId)
      .order('timestamp', { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq('status', statusFilter);
    }

    const filterFrom = (dateRange?.from && isValid(dateRange.from)) ? startOfDay(dateRange.from) : null;
    const filterTo = (dateRange?.to && isValid(dateRange.to)) ? endOfDay(dateRange.to) : ((dateRange?.from && isValid(dateRange.from)) ? endOfDay(dateRange.from) : null);

    if (filterFrom && filterTo) {
      query = query.gte('timestamp', filterFrom.toISOString()).lte('timestamp', filterTo.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching discrepancies:", error);
      showError("Failed to load discrepancies.");
      return [];
    } else {
      const fetchedDiscrepancies: DiscrepancyLog[] = data.map((log: any) => ({
        id: log.id,
        timestamp: parseAndValidateDate(log.timestamp)?.toISOString() || new Date().toISOString(), // NEW: Use parseAndValidateDate
        userId: log.user_id,
        organizationId: log.organization_id,
        itemId: log.item_id,
        itemName: log.item_name,
        locationString: log.location_string,
        locationType: log.location_type,
        originalQuantity: log.original_quantity,
        countedQuantity: log.counted_quantity,
        difference: log.difference,
        reason: log.reason,
        status: log.status,
      }));
      return fetchedDiscrepancies;
    }
  }, [profile?.organizationId, statusFilter, dateRange]); // NEW: Added dateRange to dependencies

  const generateReport = useCallback(async () => {
    const itemsToDisplay = await fetchDiscrepancies();
    await fetchAllProfiles(); // Ensure user profiles are loaded for names

    const reportProps = {
      companyName: companyProfile?.name || "Fortress Inventory",
      companyAddress: companyProfile?.address || "N/A",
      companyContact: companyProfile?.currency || "N/A",
      companyLogoUrl: localStorage.getItem("companyLogo") || undefined,
      reportDate: format(new Date(), "MMM dd, yyyy HH:mm"),
      discrepancies: itemsToDisplay,
      statusFilter,
      dateRange, // NEW: Pass dateRange to reportProps
      allProfiles, // Pass all profiles to resolve user names in PDF
      structuredLocations, // NEW: Pass structuredLocations to resolve display names
    };

    setCurrentReportData(reportProps);
    onGenerateReport({ pdfProps: reportProps, printType: "discrepancy-report" });
    setReportGenerated(true);
  }, [fetchDiscrepancies, companyProfile, statusFilter, onGenerateReport, allProfiles, fetchAllProfiles, dateRange, structuredLocations]); // NEW: Added dateRange to dependencies

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

  const { discrepancies: itemsToDisplay, statusFilter: currentStatusFilter } = currentReportData;

  return (
    <div ref={reportContentRef} className="space-y-6">
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" /> Stock Discrepancy Report
          </CardTitle>
          <p className="text-muted-foreground">
            Detailed list of reported stock discrepancies.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="statusFilter">Filter Status:</Label>
            <Select value={statusFilter} onValueChange={(value: "all" | "pending" | "resolved") => setStatusFilter(value)}>
              <SelectTrigger id="statusFilter" className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generateReport}>Refresh Report</Button>
          </div>

          <h3 className="font-semibold text-xl mt-6">
            {currentStatusFilter === "pending" ? "Pending Discrepancies" :
             currentStatusFilter === "resolved" ? "Resolved Discrepancies" :
             "All Discrepancies"} ({itemsToDisplay.length})
          </h3>
          {itemsToDisplay.length > 0 ? (
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Original Qty</TableHead>
                    <TableHead className="text-right">Counted Qty</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsToDisplay.map((discrepancy) => {
                    const discrepancyTimestamp = parseAndValidateDate(discrepancy.timestamp);
                    return (
                      <TableRow key={discrepancy.id}>
                        <TableCell className="font-medium">{discrepancy.itemName}</TableCell>
                        <TableCell>{getLocationDisplayName(discrepancy.locationString)} ({discrepancy.locationType.replace('_', ' ')})</TableCell>
                        <TableCell className="text-right">{discrepancy.originalQuantity}</TableCell>
                        <TableCell className="text-right">{discrepancy.countedQuantity}</TableCell>
                        <TableCell className="text-right text-destructive">{discrepancy.difference}</TableCell>
                        <TableCell>{discrepancy.reason}</TableCell>
                        <TableCell>{discrepancy.status}</TableCell>
                        <TableCell>{getUserName(discrepancy.userId)}</TableCell>
                        <TableCell>{discrepancyTimestamp ? format(discrepancyTimestamp, "MMM dd, yyyy HH:mm") : "N/A"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-8">No discrepancies found for the selected criteria.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DiscrepancyReport;