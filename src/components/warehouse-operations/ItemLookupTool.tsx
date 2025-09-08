import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Barcode, Package, Tag, MapPin, Info, Image } from "lucide-react";
import { useInventory } from "@/context/InventoryContext";
import { showError, showSuccess } from "@/utils/toast";
import { generateQrCodeSvg } from "@/utils/qrCodeGenerator"; // Import QR code generator
import { useOnboarding } from "@/context/OnboardingContext"; // NEW: Import useOnboarding

interface ItemLookupToolProps {
  onScanRequest: (callback: (scannedData: string) => void) => void;
  scannedDataFromGlobal?: string | null;
  onScannedDataProcessed: () => void;
}

const ItemLookupTool: React.FC<ItemLookupToolProps> = ({ onScanRequest, scannedDataFromGlobal, onScannedDataProcessed }) => {
  const { inventoryItems } = useInventory();
  const { locations: structuredLocations } = useOnboarding(); // NEW: Get structured locations
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null); // State for QR code SVG

  useEffect(() => {
    if (scannedDataFromGlobal) {
      setSearchTerm(scannedDataFromGlobal);
      handleSearch(scannedDataFromGlobal);
      onScannedDataProcessed(); // Acknowledge that the scanned data has been processed
    }
  }, [scannedDataFromGlobal, onScannedDataProcessed]);

  useEffect(() => {
    // Generate QR code for selected item display
    const generateAndSetQr = async () => {
      if (selectedItem?.barcodeUrl) { // selectedItem.barcodeUrl now stores raw data
        try {
          const svg = await generateQrCodeSvg(selectedItem.barcodeUrl, 60); // Adjusted size to 60
          setQrCodeSvg(svg);
        } catch (error) {
          console.error("Error generating QR code for item lookup display:", error);
          setQrCodeSvg(null);
        }
      } else {
        setQrCodeSvg(null);
      }
    };
    generateAndSetQr();
  }, [selectedItem]); // Regenerate if selectedItem or its barcodeUrl changes

  const filteredItems = useMemo(() => {
    if (!searchTerm) return [];
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return inventoryItems.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        item.sku.toLowerCase().includes(lowerCaseSearchTerm) ||
        (item.barcodeUrl && item.barcodeUrl.toLowerCase().includes(lowerCaseSearchTerm)) // Match against raw barcodeUrl
    );
  }, [inventoryItems, searchTerm]);

  const handleSearch = (term: string = searchTerm) => {
    if (!term.trim()) {
      showError("Please enter a search term.");
      setSelectedItem(null);
      return;
    }
    const lowerCaseTerm = term.toLowerCase();
    const foundItem = inventoryItems.find(
      (item) =>
        item.name.toLowerCase().includes(lowerCaseTerm) ||
        item.sku.toLowerCase().includes(lowerCaseTerm) ||
        (item.barcodeUrl && item.barcodeUrl.toLowerCase().includes(lowerCaseTerm)) // Match against raw barcodeUrl
    );

    if (foundItem) {
      setSelectedItem(foundItem);
      showSuccess(`Found item: ${foundItem.name}`);
    } else {
      showError(`No item found for "${term}".`);
      setSelectedItem(null);
    }
  };

  const handleScannedBarcode = (scannedData: string) => {
    setSearchTerm(scannedData);
    handleSearch(scannedData);
  };

  const handleScanClick = () => {
    onScanRequest(handleScannedBarcode);
  };

  const handleItemSelect = (item: any) => {
    setSelectedItem(item);
    setSearchTerm(item.name); // Populate search term with selected item's name
    showSuccess(`Selected item: ${item.name}`);
  };

  const getLocationDisplayName = (fullLocationString: string) => {
    const foundLoc = structuredLocations.find(loc => loc.fullLocationString === fullLocationString);
    return foundLoc?.displayName || fullLocationString;
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-xl font-bold text-center">Item Lookup & Stock Check</h2>

      {/* Search by Name/SKU */}
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="p-4 space-y-3">
          <Label htmlFor="itemSearch" className="font-semibold">Search Item</Label>
          <div className="flex gap-2">
            <Input
              id="itemSearch"
              placeholder="Name, SKU, or Part Number"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter') handleSearch(); }}
            />
            <Button onClick={() => handleSearch()}><Search className="h-4 w-4" /></Button>
          </div>
          {searchTerm && filteredItems.length > 0 && (
            <ScrollArea className="h-24 border border-border rounded-md">
              <div className="p-2 space-y-1">
                {filteredItems.map(item => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className="w-full justify-start text-sm"
                    onClick={() => handleItemSelect(item)}
                  >
                    {item.name} (SKU: {item.sku})
                  </Button>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Barcode Scan Button */}
      <Button
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3 flex items-center justify-center gap-2"
        onClick={handleScanClick}
      >
        <Barcode className="h-6 w-6" />
        Scan Barcode/QR
      </Button>

      {/* Item Details Display */}
      <ScrollArea className="flex-grow pb-4">
        {selectedItem ? (
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" /> {selectedItem.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-center mb-3">
                {selectedItem.imageUrl ? (
                  <img src={selectedItem.imageUrl} alt={selectedItem.name} className="max-h-32 object-contain rounded-md border border-border" />
                ) : (
                  <div className="h-32 w-32 bg-muted/30 rounded-md flex items-center justify-center text-muted-foreground">
                    <Image className="h-10 w-10" />
                  </div>
                )}
              </div>
              <p className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">SKU:</span> {selectedItem.sku}
              </p>
              <p className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">Location:</span> {getLocationDisplayName(selectedItem.location)}
              </p>
              <p className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">Current Stock:</span> <span className="text-lg font-bold text-primary">{selectedItem.quantity}</span> units
              </p>
              {selectedItem.description && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold">Description:</span> {selectedItem.description}
                </p>
              )}
              {qrCodeSvg && ( // Display QR code if available
                <div className="mt-2 p-4 border border-border rounded-md bg-white flex justify-center">
                  <div dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>Search or scan an item to see its details.</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ItemLookupTool;