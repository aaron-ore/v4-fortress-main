import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Package, Scan, Truck, CheckCircle, AlertTriangle, LayoutDashboard, Search as SearchIcon, ShoppingCart, ListOrdered, Undo2, MapPin, Repeat } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import WarehouseDashboard from "@/components/warehouse-operations/WarehouseDashboard";
import CameraScannerDialog from "@/components/CameraScannerDialog";
import { cn } from "@/lib/utils";
import { showError, showSuccess } from "@/utils/toast";
import { useNavigate, useLocation } from "react-router-dom";

// Import new dialog wrappers
import ItemLookupDialog from "@/components/warehouse-operations/dialogs/ItemLookupDialog";
import ReceiveInventoryDialog from "@/components/warehouse-operations/dialogs/ReceiveInventoryDialog";
import FulfillOrderDialog from "@/components/warehouse-operations/dialogs/FulfillOrderDialog";
import ShipOrderDialog from "@/components/warehouse-operations/dialogs/ShipOrderDialog";
import PickingWaveManagementDialog from "@/components/warehouse-operations/dialogs/PickingWaveManagementDialog";
import ReplenishmentManagementDialog from "@/components/warehouse-operations/dialogs/ReplenishmentManagementDialog";
import ShippingVerificationDialog from "@/components/warehouse-operations/dialogs/ShippingVerificationDialog";
import ReturnsProcessingDialog from "@/components/warehouse-operations/dialogs/ReturnsProcessingDialog";
import StockTransferDialog from "@/components/warehouse-operations/dialogs/StockTransferDialog";
import CycleCountDialog from "@/components/warehouse-operations/dialogs/CycleCountDialog";
import IssueReportDialog from "@/components/warehouse-operations/dialogs/IssueReportDialog";

const WarehouseOperationsPage: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard"); // Only dashboard remains a tab

  // State for CameraScannerDialog
  const [isCameraScannerDialogOpen, setIsCameraScannerDialogOpen] = useState(false);
  const [scanCallback, setScanCallback] = useState<((scannedData: string) => void) | null>(null);
  const [scannedDataForTool, setScannedDataForTool] = useState<string | null>(null); // Data to pass to a tool's dialog

  // States for each tool's dialog visibility
  const [isItemLookupDialogOpen, setIsItemLookupDialogOpen] = useState(false);
  const [isReceiveInventoryDialogOpen, setIsReceiveInventoryDialogOpen] = useState(false);
  const [isFulfillOrderDialogOpen, setIsFulfillOrderDialogOpen] = useState(false);
  const [isShipOrderDialogOpen, setIsShipOrderDialogOpen] = useState(false);
  const [isPickingWaveManagementDialogOpen, setIsPickingWaveManagementDialogOpen] = useState(false);
  const [isReplenishmentManagementDialogOpen, setIsReplenishmentManagementDialogOpen] = useState(false);
  const [isShippingVerificationDialogOpen, setIsShippingVerificationDialogOpen] = useState(false);
  const [isReturnsProcessingDialogOpen, setIsReturnsProcessingDialogOpen] = useState(false);
  const [isStockTransferDialogOpen, setIsStockTransferDialogOpen] = useState(false);
  const [isCycleCountDialogOpen, setIsCycleCountDialogOpen] = useState(false);
  const [isIssueReportDialogOpen, setIsIssueReportDialogOpen] = useState(false);

  // Map tool values to their dialog open/close states
  const dialogStates = {
    "item-lookup": { isOpen: isItemLookupDialogOpen, setIsOpen: setIsItemLookupDialogOpen },
    "receive-inventory": { isOpen: isReceiveInventoryDialogOpen, setIsOpen: setIsReceiveInventoryDialogOpen },
    "fulfill-order": { isOpen: isFulfillOrderDialogOpen, setIsOpen: setIsFulfillOrderDialogOpen },
    "ship-order": { isOpen: isShipOrderDialogOpen, setIsOpen: setIsShipOrderDialogOpen },
    "picking-wave": { isOpen: isPickingWaveManagementDialogOpen, setIsOpen: setIsPickingWaveManagementDialogOpen },
    "replenishment": { isOpen: isReplenishmentManagementDialogOpen, setIsOpen: setIsReplenishmentManagementDialogOpen },
    "shipping-verify": { isOpen: isShippingVerificationDialogOpen, setIsOpen: setIsShippingVerificationDialogOpen },
    "returns-process": { isOpen: isReturnsProcessingDialogOpen, setIsOpen: setIsReturnsProcessingDialogOpen },
    "stock-transfer": { isOpen: isStockTransferDialogOpen, setIsOpen: setIsStockTransferDialogOpen },
    "cycle-count": { isOpen: isCycleCountDialogOpen, setIsOpen: setIsCycleCountDialogOpen },
    "issue-report": { isOpen: isIssueReportDialogOpen, setIsOpen: setIsIssueReportDialogOpen },
  };

  const operationButtons = [
    { value: "dashboard", label: "Dashboard", icon: LayoutDashboard, type: "tab" },
    { value: "item-lookup", label: "Lookup", icon: SearchIcon, type: "dialog" },
    { value: "receive-inventory", label: "Receive", icon: Package, type: "dialog" },
    { value: "fulfill-order", label: "Fulfill", icon: ShoppingCart, type: "dialog" },
    { value: "ship-order", label: "Ship", icon: Truck, type: "dialog" },
    { value: "picking-wave", label: "Pick Wave", icon: ListOrdered, type: "dialog" },
    { value: "replenishment", label: "Replenish", icon: Repeat, type: "dialog" },
    { value: "shipping-verify", label: "Verify Ship", icon: CheckCircle, type: "dialog" },
    { value: "returns-process", label: "Returns", icon: Undo2, type: "dialog" },
    { value: "stock-transfer", label: "Transfer", icon: Scan, type: "dialog" },
    { value: "cycle-count", label: "Count", icon: CheckCircle, type: "dialog" },
    { value: "issue-report", label: "Report Issue", icon: AlertTriangle, type: "dialog" },
    // REMOVED: { value: "location-management", label: "Locations", icon: MapPin, type: "page-link" },
  ];

  // Effect to handle URL hash changes for opening tabs/dialogs
  useEffect(() => {
    const hash = location.hash.replace("#", "");

    // Close all dialogs first to ensure only one is open at a time, or none.
    Object.values(dialogStates).forEach(state => {
      if (state.isOpen) state.setIsOpen(false);
    });

    if (hash === "dashboard") {
      setActiveTab("dashboard");
    } else {
      const dialogKey = hash as keyof typeof dialogStates;
      if (dialogStates[dialogKey]) {
        dialogStates[dialogKey].setIsOpen(true);
        setActiveTab(""); // No tab active when a dialog is open
      } else {
        // If hash is invalid or empty, default to dashboard and clear hash
        setActiveTab("dashboard");
        if (hash) { // Only clear if there was an invalid hash
          navigate(location.pathname, { replace: true });
        }
      }
    }
  }, [location.hash, navigate, location.pathname]); // Dependencies for useEffect

  // Function to request a scan from a specific tool
  const requestScan = (callback: (scannedData: string) => void) => {
    setScanCallback(() => callback); // Store the tool's callback
    setIsCameraScannerDialogOpen(true); // Open the camera dialog
  };

  // Handler for when CameraScannerDialog successfully scans a barcode
  const handleScanSuccessFromDialog = (decodedText: string) => {
    if (scanCallback) {
      // If a specific tool requested the scan, call its callback
      scanCallback(decodedText);
      setScanCallback(null); // Clear the callback
    } else {
      // If it was a global scan (from the main "Scan Item" button),
      // default to opening the Item Lookup dialog with the scanned data.
      setScannedDataForTool(decodedText); // Store data to pass to dialog
      // Ensure other dialogs are closed before opening Item Lookup
      Object.values(dialogStates).forEach(state => {
        if (state.isOpen && state !== dialogStates["item-lookup"]) { // Exclude item-lookup itself
          state.setIsOpen(false);
        }
      });
      dialogStates["item-lookup"].setIsOpen(true); // Open Item Lookup dialog
      navigate(`${location.pathname}#item-lookup`, { replace: true }); // Update hash
      setActiveTab(""); // No tab active when a dialog is open
      showSuccess(`Scanned: ${decodedText}. Opening Item Lookup.`);
    }
    setIsCameraScannerDialogOpen(false); // Close the camera dialog
  };

  const handleCameraScannerDialogClose = () => {
    setIsCameraScannerDialogOpen(false);
    setScanCallback(null); // Clear any pending callback
  };

  // Callback for tools to signal they've processed the scanned data
  const handleScannedDataProcessed = () => {
    setScannedDataForTool(null); // Clear the data once consumed
  };

  // Function to handle closing a dialog and clearing hash
  const closeDialogAndClearHash = (dialogKey: keyof typeof dialogStates) => {
    dialogStates[dialogKey].setIsOpen(false);
    // Only clear the hash if it matches the dialog being closed
    if (location.hash === `#${dialogKey}`) {
      navigate(location.pathname, { replace: true });
    }
    // After closing a dialog, default back to the dashboard tab
    setActiveTab("dashboard");
  };

  if (!isMobile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center bg-card border-border">
          <CardHeader className="flex flex-col items-center gap-2">
            <Scan className="h-10 w-10 text-primary" />
            <CardTitle className="text-2xl font-bold mb-2">Warehouse Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page is optimized for mobile devices and smaller screens. Please access it from a mobile device or resize your browser window.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full p-4 bg-background text-foreground">
      <h1 className="text-2xl font-bold text-center mb-6">Warehouse Operations</h1>

      <Button
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3 flex items-center justify-center gap-2 mb-4"
        onClick={() => requestScan(() => {})} // Global scan button
      >
        <Scan className="h-6 w-6" />
        Scan Item
      </Button>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-4 p-1 bg-muted rounded-lg overflow-x-auto">
        {operationButtons.map((op) => (
          <Button
            key={op.value}
            variant="ghost"
            className={cn(
              "flex flex-col items-center justify-center h-24 w-full aspect-square py-3 px-2 text-sm font-medium rounded-lg transition-colors text-center",
              op.type === "tab" && op.value === activeTab // Highlight active tab
                ? "bg-primary text-primary-foreground shadow-sm"
                : op.type === "dialog" && dialogStates[op.value as keyof typeof dialogStates]?.isOpen // Highlight open dialog
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground hover:bg-muted/50 hover:text-primary"
            )}
            onClick={() => {
              if (op.type === "tab") {
                setActiveTab(op.value);
                navigate(`${location.pathname}#${op.value}`, { replace: true });
              } else if (op.type === "dialog") {
                const dialogKey = op.value as keyof typeof dialogStates;
                if (dialogStates[dialogKey]) {
                  // Close all other dialogs before opening this one
                  Object.values(dialogStates).forEach(state => {
                    if (state.isOpen && state !== dialogStates[dialogKey]) {
                      state.setIsOpen(false);
                    }
                  });
                  dialogStates[dialogKey].setIsOpen(true);
                  navigate(`${location.pathname}#${dialogKey}`, { replace: true });
                  setActiveTab(""); // No tab active when a dialog is open
                }
              } else if (op.type === "page-link") {
                navigate(`/${op.value}`);
              }
            }}
          >
            <op.icon className="h-6 w-6 sm:h-7 sm:w-7 mb-1" />
            <span className="text-xs sm:text-sm font-semibold">{op.label}</span>
          </Button>
        ))}
      </div>

      {/* Only Dashboard remains as a TabsContent */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col">
        <TabsContent value="dashboard" className="h-full min-h-0">
          <WarehouseDashboard />
        </TabsContent>
      </Tabs>

      {/* Render all dialogs, their visibility controlled by state */}
      <ItemLookupDialog
        isOpen={isItemLookupDialogOpen}
        onClose={() => closeDialogAndClearHash("item-lookup")}
        onScanRequest={requestScan}
        scannedDataFromGlobal={scannedDataForTool}
        onScannedDataProcessed={handleScannedDataProcessed}
      />
      <ReceiveInventoryDialog
        isOpen={isReceiveInventoryDialogOpen}
        onClose={() => closeDialogAndClearHash("receive-inventory")}
        onScanRequest={requestScan}
        scannedDataFromGlobal={scannedDataForTool}
        onScannedDataProcessed={handleScannedDataProcessed}
      />
      <FulfillOrderDialog
        isOpen={isFulfillOrderDialogOpen}
        onClose={() => closeDialogAndClearHash("fulfill-order")}
        onScanRequest={requestScan}
        scannedDataFromGlobal={scannedDataForTool}
        onScannedDataProcessed={handleScannedDataProcessed}
      />
      <ShipOrderDialog
        isOpen={isShipOrderDialogOpen}
        onClose={() => closeDialogAndClearHash("ship-order")}
        onScanRequest={requestScan}
        scannedDataFromGlobal={scannedDataForTool}
        onScannedDataProcessed={handleScannedDataProcessed}
      />
      <PickingWaveManagementDialog
        isOpen={isPickingWaveManagementDialogOpen}
        onClose={() => closeDialogAndClearHash("picking-wave")}
      />
      <ReplenishmentManagementDialog
        isOpen={isReplenishmentManagementDialogOpen}
        onClose={() => closeDialogAndClearHash("replenishment")}
      />
      <ShippingVerificationDialog
        isOpen={isShippingVerificationDialogOpen}
        onClose={() => closeDialogAndClearHash("shipping-verify")}
        onScanRequest={requestScan}
        scannedDataFromGlobal={scannedDataForTool}
        onScannedDataProcessed={handleScannedDataProcessed}
      />
      <ReturnsProcessingDialog
        isOpen={isReturnsProcessingDialogOpen}
        onClose={() => closeDialogAndClearHash("returns-process")}
        onScanRequest={requestScan}
        scannedDataFromGlobal={scannedDataForTool}
        onScannedDataProcessed={handleScannedDataProcessed}
      />
      <StockTransferDialog
        isOpen={isStockTransferDialogOpen}
        onClose={() => closeDialogAndClearHash("stock-transfer")}
        onScanRequest={requestScan}
        scannedDataFromGlobal={scannedDataForTool}
        onScannedDataProcessed={handleScannedDataProcessed}
      />
      <CycleCountDialog
        isOpen={isCycleCountDialogOpen}
        onClose={() => closeDialogAndClearHash("cycle-count")}
        onScanRequest={requestScan}
        scannedDataFromGlobal={scannedDataForTool}
        onScannedDataProcessed={handleScannedDataProcessed}
      />
      <IssueReportDialog
        isOpen={isIssueReportDialogOpen}
        onClose={() => closeDialogAndClearHash("issue-report")}
        onScanRequest={requestScan}
        scannedDataFromGlobal={scannedDataForTool}
        onScannedDataProcessed={handleScannedDataProcessed}
      />

      <CameraScannerDialog
        isOpen={isCameraScannerDialogOpen}
        onClose={handleCameraScannerDialogClose}
        onScanSuccess={handleScanSuccessFromDialog}
      />
    </div>
  );
};

export default WarehouseOperationsPage;