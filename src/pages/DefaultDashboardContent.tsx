"use client";

import React, { useState, useMemo } from "react";
import AddInventoryDialog from "@/components/AddInventoryDialog";
import ScanItemDialog from "@/components/ScanItemDialog";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { isValid, startOfDay, endOfDay } from "date-fns"; // Import startOfDay, endOfDay

// Import new dashboard components
import WalletCard from "@/components/dashboard/WalletCard";
import LossesCard from "@/components/dashboard/LossesCard";
import IncomeCard from "@/components/dashboard/IncomeCard";
import OrderFulfillmentRateCard from "@/components/dashboard/OrderFulfillmentRateCard";
import Last3MonthSalesCard from "@/components/dashboard/Last3MonthSalesCard";
import IssuesCard from "@/components/dashboard/IssuesCard";
import LiveInformationAreaChartCard from "@/components/dashboard/LiveInformationAreaChartCard";
import StockDiscrepancyCard from "@/components/dashboard/StockDiscrepancyCard";
import LocationStockHealthCard from "@/components/dashboard/LocationStockHealthCard";
import MonthlyOverviewChartCard from "@/components/dashboard/MonthlyOverviewChartCard";
import TopSellingProductsCard from "@/components/dashboard/TopSellingProductsCard"; // Replaced ProfitabilityMetricsCard
import GenerateReportButton from "@/components/dashboard/GenerateReportButton";
import { Button } from "@/components/ui/button";
import { FilterX } from "lucide-react"; // Import FilterX icon
import { parseAndValidateDate } from "@/utils/dateUtils"; // Import parseAndValidateDate

// NEW: Import the new cards for the 4th row
import OpenPurchaseOrdersCard from "@/components/dashboard/OpenPurchaseOrdersCard";
import PendingInvoicesCard from "@/components/dashboard/PendingInvoicesCard";
import LowStockAlertsCard from "@/components/dashboard/LowStockAlertsCard"; // Moved from 1st row
import RecentShipmentsCard from "@/components/dashboard/RecentShipmentsCard";

const DefaultDashboardContent: React.FC = () => {
  const [isAddInventoryDialogOpen, setIsAddInventoryDialogOpen] = useState(false);
  const [isScanItemDialogOpen, setIsScanItemDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined); // Re-added dateRange state

  const handleScanItem = () => {
    setIsScanItemDialogOpen(true);
  };

  const handleClearDateFilter = () => {
    setDateRange(undefined);
  };

  // Helper function to check if a date falls within the selected range
  const isDateInRange = (dateString: string) => {
    if (!dateRange?.from || !isValid(dateRange.from)) return true; // No valid 'from' date, so no filter applied

    const date = parseAndValidateDate(dateString);
    if (!date) return false; // Invalid date string, cannot be in range

    const from = startOfDay(dateRange.from);
    const to = dateRange.to && isValid(dateRange.to) ? endOfDay(dateRange.to) : endOfDay(dateRange.from); // Ensure 'to' is valid or default to 'from'

    return date >= from && date <= to;
  };

  return (
    <div className="space-y-6">
      {/* Header and Date Filter in the same row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <DateRangePicker dateRange={dateRange} onSelect={setDateRange} />
          {dateRange?.from && isValid(dateRange.from) && ( // Only show clear button if a valid 'from' date exists
            <Button variant="outline" onClick={handleClearDateFilter} size="icon">
              <FilterX className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Row 1: 3 cards + 1 column of 3 small cards */}
        <div className="col-span-full md:col-span-1">
          <OrderFulfillmentRateCard />
        </div>
        <div className="col-span-full md:col-span-1">
          <Last3MonthSalesCard />
        </div>
        <div className="col-span-full md:col-span-1">
          <IssuesCard dateRange={dateRange} /> {/* Pass dateRange */}
        </div>
        <div className="col-span-full md:col-span-1 flex flex-col gap-4">
          <WalletCard />
          <LossesCard />
          <IncomeCard />
          <GenerateReportButton dateRange={dateRange} /> {/* Pass dateRange */}
        </div>

        {/* Row 2: 1 wide card + 2 regular cards */}
        <div className="col-span-full md:col-span-2 lg:col-span-2 xl:col-span-2">
          <LiveInformationAreaChartCard dateRange={dateRange} /> {/* Pass dateRange */}
        </div>
        <div className="col-span-full md:col-span-1">
          <StockDiscrepancyCard dateRange={dateRange} /> {/* Pass dateRange */}
        </div>
        <div className="col-span-full md:col-span-1">
          <LocationStockHealthCard />
        </div>

        {/* Row 3: 1 very wide card + 1 regular card */}
        <div className="col-span-full md:col-span-2 lg:col-span-3 xl:col-span-3">
          <MonthlyOverviewChartCard />
        </div>
        <div className="col-span-full md:col-span-1">
          <TopSellingProductsCard /> {/* Replaced ProfitabilityMetricsCard */}
        </div>

        {/* NEW Row 4: Operational Overview Cards */}
        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <OpenPurchaseOrdersCard />
          <PendingInvoicesCard />
          <LowStockAlertsCard /> {/* Moved from Row 1 */}
          <RecentShipmentsCard />
        </div>
      </div>

      <AddInventoryDialog
        isOpen={isAddInventoryDialogOpen}
        onClose={() => setIsAddInventoryDialogOpen(false)}
      />
      <ScanItemDialog
        isOpen={isScanItemDialogOpen}
        onClose={() => setIsScanItemDialogOpen(false)}
      />
    </div>
  );
};

export default DefaultDashboardContent;