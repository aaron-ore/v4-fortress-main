"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useProfile } from "@/context/ProfileContext";
import { showError } from "@/utils/toast";
import { format, startOfDay, endOfDay, subDays, isValid } from "date-fns";
import { DateRange } from "react-day-picker";
import DailyIssuesDialog from "./DailyIssuesDialog";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

interface IssuesCardProps {
  dateRange: DateRange | undefined; // NEW: dateRange prop
}

const IssuesCard: React.FC<IssuesCardProps> = ({ dateRange }) => { // NEW: Destructure dateRange
  const { profile } = useProfile();
  const [dailyIssuesCount, setDailyIssuesCount] = useState(0);
  const [previousPeriodIssuesCount, setPreviousPeriodIssuesCount] = useState(0);
  const [isDailyIssuesDialogOpen, setIsDailyIssuesDialogOpen] = useState(false);

  const fetchIssuesCounts = async () => {
    if (!profile?.organizationId) {
      setDailyIssuesCount(0);
      setPreviousPeriodIssuesCount(0);
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
        .from('activity_logs')
        .select('id', { count: 'exact' })
        .eq('organization_id', profile.organizationId)
        .eq('activity_type', 'Issue Reported')
        .gte('timestamp', start.toISOString())
        .lte('timestamp', end.toISOString());

      if (error) {
        console.error("Error fetching issues count:", error);
        showError("Failed to load issues count.");
        return 0;
      }
      return count || 0;
    };

    const currentCount = await fetchCount(currentPeriodStart, currentPeriodEnd);
    const prevCount = await fetchCount(previousPeriodStart, previousPeriodEnd);

    setDailyIssuesCount(currentCount);
    setPreviousPeriodIssuesCount(prevCount);
  };

  useEffect(() => {
    fetchIssuesCounts();
    // Set up real-time listener for new issues
    const channel = supabase
      .channel('daily_issues_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `organization_id=eq.${profile?.organizationId}&activity_type=eq.Issue Reported`,
        },
        (payload) => {
          // Ensure timestamp is valid before creating a Date object
          const newIssueDate = parseAndValidateDate(payload.new.timestamp); // NEW: Use parseAndValidateDate
          const today = new Date();
          let currentPeriodStart: Date;
          let currentPeriodEnd: Date;

          currentPeriodStart = (dateRange?.from && isValid(dateRange.from)) ? startOfDay(dateRange.from) : startOfDay(today);
          currentPeriodEnd = (dateRange?.to && isValid(dateRange.to)) ? endOfDay(dateRange.to) : ((dateRange?.from && isValid(dateRange.from)) ? endOfDay(dateRange.from) : endOfDay(today));

          const isWithinCurrentPeriod = (newIssueDate && isValid(newIssueDate) && newIssueDate >= currentPeriodStart && newIssueDate <= currentPeriodEnd); // Check for null newIssueDate and isValid

          if (isWithinCurrentPeriod) {
            setDailyIssuesCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.organizationId, dateRange]); // NEW: Added dateRange to dependencies

  const percentageChange = useMemo(() => {
    if (previousPeriodIssuesCount === 0) {
      return dailyIssuesCount > 0 ? "100.0" : "0.0";
    }
    const change = ((dailyIssuesCount - previousPeriodIssuesCount) / previousPeriodIssuesCount) * 100;
    return change.toFixed(1);
  }, [dailyIssuesCount, previousPeriodIssuesCount]);

  const isPositiveChange = dailyIssuesCount >= previousPeriodIssuesCount;

  return (
    <>
      <Card className="bg-card border-border rounded-lg shadow-sm p-4 flex flex-col h-[310px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold text-foreground">Issues Reported</CardTitle>
          <p className="text-sm text-muted-foreground">
            Today's operational issues
          </p>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col items-center justify-center relative p-4 pt-0">
          <div className="text-6xl font-bold text-destructive">
            {dailyIssuesCount}
          </div>
          <p className={`text-sm ${isPositiveChange ? "text-red-500" : "text-green-500"} flex items-center justify-center mt-2`}>
            {isPositiveChange ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />} {percentageChange}% from previous period
          </p>
          <Button
            className="mt-auto w-full"
            onClick={() => setIsDailyIssuesDialogOpen(true)}
            disabled={dailyIssuesCount === 0}
          >
            <AlertTriangle className="h-4 w-4 mr-2" /> View Issues
          </Button>
        </CardContent>
      </Card>
      <DailyIssuesDialog
        isOpen={isDailyIssuesDialogOpen}
        onClose={() => setIsDailyIssuesDialogOpen(false)}
        dateRange={dateRange} // Pass dateRange
      />
    </>
  );
};

export default IssuesCard;