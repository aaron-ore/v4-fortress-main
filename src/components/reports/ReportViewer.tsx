"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Printer, Brain } from "lucide-react";
import { usePrint } from "@/context/PrintContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useProfile } from "@/context/ProfileContext";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";

import InventoryValuationReport from "./InventoryValuationReport";
import LowStockReport from "./LowStockReport";
import InventoryMovementReport from "./InventoryMovementReport";
import SalesByCustomerReport from "./SalesByCustomerReport";
import SalesByProductReport from "././SalesByProductReport";
import PurchaseOrderStatusReport from "./PurchaseOrderStatusReport";
import ProfitabilityReport from "./ProfitabilityReport";
import DiscrepancyReport from "./DiscrepancyReport";
import DashboardSummaryReport from "./DashboardSummaryReport"; // For the overview report

interface ReportViewerProps {
  reportId: string;
  dateRange: DateRange | undefined; // NEW: Accept dateRange prop
}

// Map report IDs to their respective components
const reportComponents: { [key: string]: React.ElementType } = {
  "dashboard-summary": DashboardSummaryReport,
  "inventory-valuation": InventoryValuationReport,
  "low-stock-out-of-stock": LowStockReport,
  "inventory-movement": InventoryMovementReport,
  "sales-by-customer": SalesByCustomerReport,
  "sales-by-product": SalesByProductReport,
  "purchase-order-status": PurchaseOrderStatusReport,
  "profitability": ProfitabilityReport,
  "stock-discrepancy": DiscrepancyReport,
};

const ReportViewer: React.FC<ReportViewerProps> = ({ reportId, dateRange }) => { // NEW: Destructure dateRange
  const { initiatePrint } = usePrint();
  const { companyProfile, locations: structuredLocations } = useOnboarding(); // NEW: Get structured locations
  const { profile } = useProfile();

  const [reportData, setReportData] = useState<any>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState("");

  // Ref to hold the report content for printing
  const reportContentRef = useRef<HTMLDivElement>(null);

  const CurrentReportComponent = reportComponents[reportId];

  // Function to generate the text content of the report for AI summarization
  const generateReportTextContent = useCallback(() => {
    if (reportContentRef.current) {
      const rawInnerText = reportContentRef.current.innerText;
      console.log("Client-side: Raw innerText from reportContentRef:", `"${rawInnerText}"`, "length:", rawInnerText.length);

      const text = rawInnerText
        .replace(/(\r\n|\n|\r){2,}/g, '\n\n') // Reduce multiple newlines to max two
        .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
        .trim();
      return text;
    }
    console.log("Client-side: reportContentRef.current is null.");
    return "";
  }, [reportContentRef]);

  const handleGenerateReport = useCallback(async (data: { pdfProps: any; printType: string }) => {
    setIsLoadingReport(true);
    setReportData(data); // The child component will pass its processed data here
    setIsLoadingReport(false);
    setAiSummary(""); // Clear previous AI summary
  }, []);

  const handlePrintReport = useCallback(() => {
    if (!reportData) {
      showError("No report data to print. Please generate the report first.");
      return;
    }
    if (!companyProfile) {
      showError("Company profile not set up. Please complete onboarding or set company details in settings.");
      return;
    }

    // Each report component will need to provide its specific PDF content props
    // This is a placeholder, actual implementation will be in individual report components
    const pdfProps = {
      companyName: companyProfile.name,
      companyAddress: companyProfile.address,
      companyContact: companyProfile.currency, // Using currency as a generic contact for company
      companyLogoUrl: companyProfile.companyLogoUrl || undefined, // NEW: Pass companyLogoUrl
      reportDate: new Date().toLocaleDateString(),
      dateRange, // NEW: Pass dateRange to PDF props
      structuredLocations, // NEW: Pass structuredLocations to PDF props
      ...reportData.pdfProps, // Specific props from the generated report
    };

    initiatePrint({ type: reportData.printType, props: pdfProps });
    showSuccess("Report sent to printer!");
  }, [reportData, companyProfile, initiatePrint, dateRange, structuredLocations]); // NEW: Add dateRange and structuredLocations to dependencies

  const handleSummarizeReport = async () => {
    if (!reportData) {
      showError("No report data to summarize. Please generate the report first.");
      setIsSummarizing(false);
      return;
    }
    setIsSummarizing(true);
    setAiSummary(""); // Clear previous AI summary

    if (!reportContentRef.current) {
      showError("Report content not rendered. Please ensure the report is visible and fully loaded.");
      setIsSummarizing(false);
      return;
    }

    try {
      const rawText = generateReportTextContent();
      let textToSummarize = rawText.trim();

      if (!textToSummarize) {
        console.warn("Client-side: Report text content is empty after extraction. Cannot send for AI summary.");
        showError("No report content found to summarize. Please ensure the report is fully loaded and visible.");
        setIsSummarizing(false);
        return;
      }
      // NEW: Log the textToSummarize right before sending
      console.log("Client-side: Final textToSummarize before sending to Edge Function:", `"${textToSummarize.substring(0, 500)}..."`, "length:", textToSummarize.length);


      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showError("You must be logged in to use the AI Summary tool.");
        setIsSummarizing(false);
        return;
      }

      // NEW: Log the session and access_token before the fetch call
      console.log("Client-side: Session object before fetch:", session);
      console.log("Client-side: Access token before fetch:", session.access_token);

      // NEW: Direct fetch request to the Edge Function
      const edgeFunctionUrl = `https://nojumocxivfjsbqnnkqe.supabase.co/functions/v1/summarize-report`;
      console.log("Client-side: Making direct fetch request to:", edgeFunctionUrl);

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ textToSummarize }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Client-side: Direct fetch to Edge Function failed. Status:", response.status, "Error data:", errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.summary) {
        setAiSummary(data.summary);
        showSuccess("Report summarized successfully!");
      } else {
        showError("Failed to get a summary from the AI. Please try again.");
      }
    } catch (error: any) {
      console.error("Error generating summary:", error); // Changed log message
      showError(`Error generating summary: ${error.message}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  if (!reportId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a report from the sidebar to get started.
      </div>
    );
  }

  if (!CurrentReportComponent) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        Report type "{reportId}" not found.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Removed Report Configuration Card as it's now in the parent Reports component */}

      <div className="flex-grow overflow-y-auto">
        <CurrentReportComponent
          dateRange={dateRange} // NEW: Pass dateRange prop to child component
          onGenerateReport={handleGenerateReport}
          isLoading={isLoadingReport}
          reportContentRef={reportContentRef} // Pass ref to child component
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 justify-end">
        <Button onClick={handleSummarizeReport} disabled={isSummarizing || !reportData}>
          {isSummarizing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Summarizing...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" /> AI Summary
            </>
          )}
        </Button>
        <Button onClick={handlePrintReport} disabled={!reportData}>
          <Printer className="h-4 w-4 mr-2" /> Print/PDF
        </Button>
      </div>

      {aiSummary && (
        <Card className="mt-4 bg-card border-border rounded-lg shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Brain className="h-6 w-6 text-accent" /> AI Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/20 p-4 rounded-md border border-border">
              <p className="text-foreground whitespace-pre-wrap">{aiSummary}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportViewer;