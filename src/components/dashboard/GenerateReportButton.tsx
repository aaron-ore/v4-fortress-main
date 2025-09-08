import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { usePrint } from "@/context/PrintContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useInventory } from "@/context/InventoryContext";
import { useOrders } from "@/context/OrdersContext";
import { showError } from "@/utils/toast";
import { format, isWithinInterval, startOfDay, endOfDay, isValid } from "date-fns";
import { DateRange } from "react-day-picker";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate
import { useProfile } from "@/context/ProfileContext"; // NEW: Import useProfile

interface GenerateReportButtonProps {
  dateRange: DateRange | undefined; // NEW: dateRange prop
}

const GenerateReportButton: React.FC<GenerateReportButtonProps> = ({ dateRange }) => { // NEW: Destructure dateRange
  const { initiatePrint } = usePrint();
  const { companyProfile } = useOnboarding();
  const { inventoryItems } = useInventory();
  const { orders } = useOrders();
  const { profile } = useProfile(); // NEW: Get profile from ProfileContext

  const filterFrom = (dateRange?.from && isValid(dateRange.from)) ? startOfDay(dateRange.from) : null;
  const filterTo = (dateRange?.to && isValid(dateRange.to)) ? endOfDay(dateRange.to) : ((dateRange?.from && isValid(dateRange.from)) ? endOfDay(dateRange.from) : null);

  const filteredInventory = useMemo(() => {
    return inventoryItems.filter(item => {
      const itemLastUpdated = parseAndValidateDate(item.lastUpdated);
      if (!itemLastUpdated || !isValid(itemLastUpdated)) return false;
      if (filterFrom && filterTo) {
        return isWithinInterval(itemLastUpdated, { start: filterFrom, end: filterTo });
      }
      return true;
    });
  }, [inventoryItems, filterFrom, filterTo]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = parseAndValidateDate(order.date);
      if (!orderDate || !isValid(orderDate)) return false;
      if (filterFrom && filterTo) {
        return isWithinInterval(orderDate, { start: filterFrom, end: filterTo });
      }
      return true;
    });
  }, [orders, filterFrom, filterTo]);

  const totalStockValue = useMemo(() => {
    return filteredInventory.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  }, [filteredInventory]);

  const totalUnitsOnHand = useMemo(() => {
    return filteredInventory.reduce((sum, item) => sum + item.quantity, 0);
  }, [filteredInventory]);

  const lowStockItems = useMemo(() => {
    return filteredInventory.filter(item => item.quantity <= item.reorderLevel);
  }, [filteredInventory]);

  const outOfStockItems = useMemo(() => {
    return filteredInventory.filter(item => item.quantity === 0);
  }, [filteredInventory]);

  const recentSalesOrders = useMemo(() => {
    return filteredOrders
      .filter(order => order.type === "Sales")
      .sort((a, b) => {
        const dateA = parseAndValidateDate(a.date);
        const dateB = parseAndValidateDate(b.date);
        if (!dateA || !dateB || !isValid(dateA) || !isValid(dateB)) return 0;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5); // Get top 5 recent sales orders
  }, [filteredOrders]);

  const recentPurchaseOrders = useMemo(() => {
    return filteredOrders
      .filter(order => order.type === "Purchase")
      .sort((a, b) => {
        const dateA = parseAndValidateDate(a.date);
        const dateB = parseAndValidateDate(b.date);
        if (!dateA || !dateB || !isValid(dateA) || !isValid(dateB)) return 0;
        return dateB.getTime() - dateB.getTime();
      })
      .slice(0, 5); // Get top 5 recent purchase orders
  }, [filteredOrders]);

  const handleGenerateReport = () => {
    if (!profile?.companyName || !profile?.companyAddress || !profile?.companyCurrency) { // NEW: Check profile for company info
      showError("Company profile not set up. Please complete onboarding or set company details in settings.");
      return;
    }

    const reportProps = {
      companyName: profile.companyName, // NEW: Use from profile
      companyAddress: profile.companyAddress, // NEW: Use from profile
      companyContact: profile.companyCurrency, // NEW: Use from profile
      companyLogoUrl: profile.companyLogoUrl || undefined, // NEW: Use from profile
      reportDate: format(new Date(), "MMM dd, yyyy HH:mm"),
      totalStockValue,
      totalUnitsOnHand,
      lowStockItems,
      outOfStockItems,
      recentSalesOrders,
      recentPurchaseOrders,
      dateRange, // NEW: Pass dateRange to reportProps
    };

    initiatePrint({ type: "dashboard-summary", props: reportProps });
  };

  return (
    <Button className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold" onClick={handleGenerateReport}> {/* Adjusted height to h-10 (40px) */}
      <Printer className="h-4 w-4 mr-2" /> Generate Report
    </Button>
  );
};

export default GenerateReportButton;