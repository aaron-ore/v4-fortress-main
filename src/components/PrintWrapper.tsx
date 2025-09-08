import React, { useEffect } from "react";
import PurchaseOrderPdfContent from "./PurchaseOrderPdfContent";
import InvoicePdfContent from "./InvoicePdfContent";
import DashboardSummaryPdfContent from "./DashboardSummaryPdfContent"; // New import
import { PrintContentData } from "@/context/PrintContext"; // Only import the interface
import AdvancedDemandForecastPdfContent from "./AdvancedDemandForecastPdfContent"; // NEW
import PutawayLabelPdfContent from "./PutawayLabelPdfContent"; // NEW
import LocationLabelPdfContent from "./LocationLabelPdfContent"; // NEW
import PickingWavePdfContent from "./PickingWavePdfContent"; // NEW

interface PrintWrapperProps {
  contentData: PrintContentData;
  onPrintComplete: () => void; // New prop
  children: React.ReactNode; // Add children prop
}

const PrintWrapper: React.FC<PrintWrapperProps> = ({ contentData, onPrintComplete, children }) => {
  useEffect(() => {
    if (!contentData) {
      // If contentData somehow becomes null while PrintWrapper is mounted,
      // immediately call onPrintComplete to reset the parent state.
      onPrintComplete();
      return;
    }

    // Use a timeout to ensure window.print() is called after the component has rendered
    // and the browser has a chance to update the DOM for printing.
    const printTimeout = setTimeout(() => {
      window.print();
      // Immediately call onPrintComplete after print dialog is initiated.
      // This is crucial for the "cancel" scenario.
      onPrintComplete();
    }, 0); // A 0ms timeout defers execution until after the current render cycle

    // Cleanup function for when the component unmounts
    return () => {
      clearTimeout(printTimeout);
    };
  }, [contentData, onPrintComplete]);

  if (!contentData) {
    return null;
  }

  return (
    <div className="print-only-content">
      {/* Render children directly, which will contain the specific PDF content */}
      {children}
    </div>
  );
};

export default PrintWrapper;