"use client";

import React, { createContext, useState, useContext, ReactNode, useCallback } from "react";

export interface PrintContentData { // Exported interface
  type: "purchase-order" | "invoice" | "dashboard-summary" | "advanced-demand-forecast" | "putaway-label" | "location-label" | "picking-wave" |
        "inventory-valuation-report" | "low-stock-report" | "inventory-movement-report" | "sales-by-customer-report" | "sales-by-product-report" | "purchase-order-status-report" | "profitability-report" | "discrepancy-report"; // NEW: Added report types
  props: any; // The actual props for the respective PDF content component
}

interface PrintContextType {
  isPrinting: boolean;
  printContentData: PrintContentData | null;
  initiatePrint: (data: PrintContentData) => void;
  resetPrintState: () => void;
}

const PrintContext = createContext<PrintContextType | undefined>(undefined);

export const PrintProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printContentData, setPrintContentData] = useState<PrintContentData | null>(null);

  const initiatePrint = useCallback((data: PrintContentData) => {
    setPrintContentData(data);
    setIsPrinting(true);
  }, []);

  const resetPrintState = useCallback(() => {
    setIsPrinting(false);
    setPrintContentData(null);
  }, []);

  return (
    <PrintContext.Provider value={{ isPrinting, printContentData, initiatePrint, resetPrintState }}>
      {children}
    </PrintContext.Provider>
  );
};

export const usePrint = () => {
  const context = useContext(PrintContext);
  if (context === undefined) {
    throw new Error("usePrint must be used within a PrintProvider");
  }
  return context;
};