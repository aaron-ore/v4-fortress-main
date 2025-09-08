"use client";

import * as React from "react";
import { format, isValid, startOfDay, endOfDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange, SelectRangeEventHandler } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onSelect: SelectRangeEventHandler;
  className?: string;
  align?: "start" | "center" | "end";
}

export function DateRangePicker({
  dateRange,
  onSelect,
  className,
  align = "end",
}: DateRangePickerProps) {
  const isMobile = useIsMobile();

  const handleSelect: SelectRangeEventHandler = (range, selectedDay, activeModifiers, e) => {
    // Ensure that the selected dates are valid before passing them on
    const from = range?.from && isValid(range.from) ? startOfDay(range.from) : undefined;
    const to = range?.to && isValid(range.to) ? endOfDay(range.to) : undefined;
    onSelect({ from, to }, selectedDay, activeModifiers, e);
  };

  const content = (
    <Calendar
      initialFocus
      mode="range"
      defaultMonth={dateRange?.from && isValid(dateRange.from) ? dateRange.from : new Date()} // Default to current date if invalid
      selected={dateRange}
      onSelect={handleSelect}
      numberOfMonths={isMobile ? 1 : 2}
      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
    />
  );

  const trigger = (
    <Button
      id="date-range-picker"
      variant={"outline"}
      className={cn(
        "w-full justify-start text-left font-normal",
        !dateRange?.from && "text-muted-foreground", // Check for from property
        className
      )}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {dateRange?.from && isValid(dateRange.from) ? ( // Explicitly check isValid
        dateRange.to && isValid(dateRange.to) ? ( // Explicitly check isValid
          <>
            {format(dateRange.from, "LLL dd, y")} -{" "}
            {format(dateRange.to, "LLL dd, y")}
          </>
        ) : (
          format(dateRange.from, "LLL dd, y")
        )
      ) : (
        <span>Pick a date range</span>
      )}
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Select Date Range</DrawerTitle>
          </DrawerHeader>
          <div className="flex justify-center pb-4">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className={cn("w-auto p-0", className)} align={align}>
        {content}
      </PopoverContent>
    </Popover>
  );
}