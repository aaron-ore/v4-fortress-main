"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Package, MapPin, MessageSquare, Barcode } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { useInventory } from "@/context/InventoryContext";
import { useNotifications } from "@/context/NotificationContext";
import { supabase } from "@/lib/supabaseClient";
import { useProfile } from "@/context/ProfileContext";
import { useOnboarding } from "@/context/OnboardingContext"; // NEW: Import useOnboarding

interface IssueReportToolProps {
  onScanRequest: (callback: (scannedData: string) => void) => void;
  scannedDataFromGlobal?: string | null;
  onScannedDataProcessed: () => void;
}

const IssueReportTool: React.FC<IssueReportToolProps> = ({ onScanRequest, scannedDataFromGlobal, onScannedDataProcessed }) => {
  const { inventoryItems } = useInventory();
  const { addNotification } = useNotifications();
  const { profile } = useProfile();
  const { locations } = useOnboarding(); // NEW: Get locations from OnboardingContext

  const [issueType, setIssueType] = useState("");
  const [itemId, setItemId] = useState("");
  const [location, setLocation] = useState(""); // This will be fullLocationString
  const [description, setDescription] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  const selectedItem = inventoryItems.find(item => item.id === itemId);

  useEffect(() => {
    if (scannedDataFromGlobal && !isScanning) {
      handleScannedBarcode(scannedDataFromGlobal);
      onScannedDataProcessed();
    }
  }, [scannedDataFromGlobal, isScanning, onScannedDataProcessed]);

  const handleScannedBarcode = (scannedData: string) => {
    setIsScanning(false);
    const lowerCaseScannedData = scannedData.toLowerCase();
    const foundItem = inventoryItems.find(
      (item) =>
        item.sku.toLowerCase() === lowerCaseScannedData ||
        (item.barcodeUrl && item.barcodeUrl.toLowerCase().includes(lowerCaseScannedData))
    );

    if (foundItem) {
      setItemId(foundItem.id);
      setLocation(foundItem.location); // Pre-fill location if item found (fullLocationString)
      showSuccess(`Scanned item: ${foundItem.name}. Item and location pre-filled.`);
    } else {
      showError(`No item found with SKU/Barcode: "${scannedData}".`);
    }
  };

  const handleScanClick = () => {
    setIsScanning(true);
    onScanRequest(handleScannedBarcode);
  };

  const handleSubmitReport = async () => {
    if (!issueType || !description || !contactInfo) {
      showError("Please fill in all required fields (Issue Type, Description, Contact Info).");
      return;
    }

    const reportDetails = {
      issueType,
      itemId: selectedItem?.id || "N/A",
      itemName: selectedItem?.name || "N/A",
      location: location || "N/A",
      description,
      contactInfo,
      timestamp: new Date().toISOString(),
    };

    console.log("Issue Report Submitted:", reportDetails);
    addNotification(`New Issue Reported: ${issueType} for ${selectedItem?.name || 'N/A'}`, "warning");
    showSuccess("Issue report submitted successfully! A manager has been notified.");

    // NEW: Log to activity_logs table
    if (profile?.organizationId && profile?.id) {
      const { error: logError } = await supabase
        .from('activity_logs')
        .insert({
          user_id: profile.id,
          organization_id: profile.organizationId,
          activity_type: "Issue Reported",
          description: `Issue: ${issueType} - ${selectedItem?.name || 'N/A'}`,
          details: reportDetails, // Store full details in JSONB
        });

      if (logError) {
        console.error("Error logging issue to activity_logs:", logError);
        showError("Failed to log issue internally.");
      }
    } else {
      console.warn("Cannot log issue: User profile or organization ID missing.");
    }

    // Reset form
    setIssueType("");
    setItemId("");
    setLocation("");
    setDescription("");
    setContactInfo("");
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-xl font-bold text-center">Report an Issue</h2>

      <ScrollArea className="flex-grow pb-4">
        <div className="space-y-4 pr-2">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" /> Issue Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="issueType" className="font-semibold">Issue Type <span className="text-red-500">*</span></Label>
                <Select value={issueType} onValueChange={setIssueType}>
                  <SelectTrigger id="issueType">
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damaged-item">Damaged Item</SelectItem>
                    <SelectItem value="misplaced-item">Misplaced Item</SelectItem>
                    <SelectItem value="stock-discrepancy">Stock Discrepancy</SelectItem>
                    <SelectItem value="equipment-malfunction">Equipment Malfunction</SelectItem>
                    <SelectItem value="safety-hazard">Safety Hazard</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3 flex items-center justify-center gap-2"
                onClick={handleScanClick}
                disabled={isScanning}
              >
                <Barcode className="h-6 w-6" />
                {isScanning ? "Scanning..." : "Scan Affected Item"}
              </Button>

              <div className="space-y-2">
                <Label htmlFor="itemId" className="font-semibold">Affected Item (Optional)</Label>
                <Select value={itemId} onValueChange={setItemId}>
                  <SelectTrigger id="itemId">
                    <SelectValue placeholder="Select an item (if applicable)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="n/a">N/A (General Issue)</SelectItem>
                    {inventoryItems.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} (SKU: {item.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="font-semibold">Location (Optional)</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger id="location">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="N/A">N/A (General Location)</SelectItem>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.fullLocationString}>
                        {loc.displayName || loc.fullLocationString}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="font-semibold">Description <span className="text-red-500">*</span></Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide a detailed description of the issue..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactInfo" className="font-semibold">Your Contact Info <span className="text-red-500">*</span></Label>
                <Input
                  id="contactInfo"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="Email or Phone Number"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      <div className="mt-6">
        <Button onClick={handleSubmitReport} className="w-full" disabled={!issueType || !description || !contactInfo}>
          <MessageSquare className="h-4 w-4 mr-2" /> Submit Report
        </Button>
      </div>
    </div>
  );
};

export default IssueReportTool;