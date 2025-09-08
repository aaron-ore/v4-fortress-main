"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowUp, ArrowDown, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useProfile } from "@/context/ProfileContext";
import { showError } from "@/utils/toast";
import { format, startOfDay, endOfDay, subDays, isValid } from "date-fns";
import { DateRange } from "react-day-picker";
import StockDiscrepancyDetailsDialog from "./StockDiscrepancyDetailsDialog";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

interface StockDiscrepancyCardProps {
  dateRange: DateRange | undefined; // NEW: dateRange prop
}

const StockDiscrepancyCard: React.FC<StockDiscrepancyCardProps> = ({ dateRange }) => { // NEW: Destructure dateRange
  const { profile } = useProfile();
  const [pendingDiscrepanciesCount, setPendingDiscrepanciesCount] = useState(0);
  const [previousPeriodDiscrepanciesCount, setPreviousPeriodDiscrepanciesCount] = useState(0);
  const [isDiscrepancyDetailsDialogOpen, setIsDiscrepancyDetailsDialogOpen] = useState(false);

  const fetchDiscrepancyCounts = async () => {
    if (!profile?.organizationId) {
      setPendingDiscrepanciesCount(0);
      setPreviousPeriodDiscrepanciesCount(0);
      return;
    }

    const today = new Date();
    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;
    let previousPeriodStart: Date;
    let previousPeriodEnd: Date;

    // Determine current period based on dateRange prop
    currentPeriodStart = (dateRange?.from && isValid(dateRange.from)) ? startOfDay(dateRange.from) : startOfDay(today);
    currentPeriodEnd = (dateRange?.to && isValid(dateRange.to)) ? endOfDay(dateRange.to) : ((dateRange?.from && isValid(dateRange.from)) ? endOfDay(dateRange.from) : endOfDay(today));

    const durationMs = currentPeriodEnd.getTime() - currentPeriodStart.getTime();
    previousPeriodEnd = subDays(currentPeriodStart, 1);
    previousPeriodStart = new Date(previousPeriodEnd.getTime() - durationMs);

    const fetchCount = async (start: Date, end: Date) => {
      const { count, error } = await supabase
        .from('discrepancies')
        .select('id', { count: 'exact' })
        .eq('organization_id', profile.organizationId)
        .eq('status', 'pending')
        .gte('timestamp', start.toISOString())
        .lte('timestamp', end.toISOString());

      if (error) {
        console.error("Error fetching discrepancies count:", error);
        showError("Failed to load discrepancies count.");
        return 0;
      }
      return count || 0;
    };

    const currentCount = await fetchCount(currentPeriodStart, currentPeriodEnd);
    const prevCount = await fetchCount(previousPeriodStart, previousPeriodEnd);

    setPendingDiscrepanciesCount(currentCount);
    setPreviousPeriodDiscrepanciesCount(prevCount);
  };

  useEffect(() => {
    fetchDiscrepancyCounts();
    // Set up real-time listener for new discrepancies
    const channel = supabase
      .channel('pending_discrepancies_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'discrepancies',
          filter: `organization_id=eq.${profile?.organizationId}&status=eq.pending`,
        },
        (payload) => {
          // Ensure timestamp is valid before creating a Date object
          const newDiscrepancyDate = parseAndValidateDate(payload.new.timestamp); // NEW: Use parseAndValidateDate
          const today = new Date();
          let currentPeriodStart: Date;
          let currentPeriodEnd: Date;

          currentPeriodStart = (dateRange?.from && isValid(dateRange.from)) ? startOfDay(dateRange.from) : startOfDay(today);
          currentPeriodEnd = (dateRange?.to && isValid(dateRange.to)) ? endOfDay(dateRange.to) : ((dateRange?.from && isValid(dateRange.from)) ? endOfDay(dateRange.from) : endOfDay(today));

          const isWithinCurrentPeriod = (newDiscrepancyDate && isValid(newDiscrepancyDate) && newDiscrepancyDate >= currentPeriodStart && newDiscrepancyDate <= currentPeriodEnd); // Check for null newDiscrepancyDate and isValid

          if (isWithinCurrentPeriod) {
            setPendingDiscrepanciesCount((prev) => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'discrepancies',
          filter: `organization_id=eq.${profile?.organizationId}&status=eq.pending`,
        },
        (payload) => {
          // If a pending discrepancy is updated to resolved, decrement count
          if (payload.old.status === 'pending' && payload.new.status !== 'pending') {
            setPendingDiscrepanciesCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.organizationId, dateRange]); // NEW: Added dateRange to dependencies

  const percentageChange = useMemo(() => {
    if (previousPeriodDiscrepanciesCount === 0) {
      return pendingDiscrepanciesCount > 0 ? "100.0" : "0.0";
    }
    const change = ((pendingDiscrepanciesCount - previousPeriodDiscrepanciesCount) / previousPeriodDiscrepanciesCount) * 100;
    return change.toFixed(1);
  }, [pendingDiscrepanciesCount, previousPeriodDiscrepanciesCount]);

  const isPositiveChange = pendingDiscrepanciesCount >= previousPeriodDiscrepanciesCount;

  return (
    <>
      <Card className="bg-card border-border rounded-lg shadow-sm p-4 flex flex-col h-[310px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold text-foreground">Stock Discrepancies</CardTitle>
          <p className="text-sm text-muted-foreground">
            Today's pending discrepancies
          </p>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col items-center justify-center relative p-4 pt-0">
          <div className="text-6xl font-bold text-destructive">
            {pendingDiscrepanciesCount}
          </div>
          <p className={`text-sm ${isPositiveChange ? "text-red-500" : "text-green-500"} flex items-center justify-center mt-2`}>
            {isPositiveChange ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />} {percentageChange}% from previous period
          </p>
          <Button
            className="mt-auto w-full"
            onClick={() => setIsDiscrepancyDetailsDialogOpen(true)}
            disabled={pendingDiscrepanciesCount === 0}
          >
            <Scale className="h-4 w-4 mr-2" /> View Discrepancies
          </Button>
        </CardContent>
      </Card>
      <StockDiscrepancyDetailsDialog
        isOpen={isDiscrepancyDetailsDialogOpen}
        onClose={() => setIsDiscrepancyDetailsDialogOpen(false)}
        dateRange={dateRange} // Pass dateRange
      />
    </>
  );
};

export default StockDiscrepancyCard;