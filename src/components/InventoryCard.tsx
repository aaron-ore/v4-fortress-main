import React, { useState, useEffect } from "react"; // Added useEffect and useState
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Tag, MapPin, Eye, PlusCircle, MinusCircle, Trash2 } from "lucide-react";
import { InventoryItem } from "@/context/InventoryContext";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { generateQrCodeSvg } from "@/utils/qrCodeGenerator"; // Import QR code generator
import { useOnboarding } from "@/context/OnboardingContext"; // NEW: Import useOnboarding

interface InventoryCardProps {
  item: InventoryItem;
  onAdjustStock: (item: InventoryItem) => void;
  onCreateOrder: (item: InventoryItem) => void;
  onViewDetails: (item: InventoryItem) => void;
  onDeleteItem: (itemId: string, itemName: string) => void;
  isSidebarCollapsed: boolean;
}

const InventoryCard: React.FC<InventoryCardProps> = ({
  item,
  onAdjustStock,
  onCreateOrder,
  onViewDetails,
  onDeleteItem,
  isSidebarCollapsed,
}) => {
  // REMOVED: QR code state and effect are no longer needed for the card display
  // const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null); // State for QR code SVG
  // useEffect(() => {
  //   const generateAndSetQr = async () => {
  //     if (item.barcodeUrl) { // item.barcodeUrl now stores the raw data
  //       try {
  //         const svg = await generateQrCodeSvg(item.barcodeUrl, 40); // Adjusted size to 40
  //         setQrCodeSvg(svg);
  //       } catch (error) {
  //         console.error("Error generating QR code for card display:", error);
  //         setQrCodeSvg(null);
  //       }
  //     } else {
  //       setQrCodeSvg(null);
  //     }
  //   };
  //   generateAndSetQr();
  // }, [item.barcodeUrl]); // Regenerate if barcodeUrl changes

  const { locations: structuredLocations } = useOnboarding(); // NEW: Get structured locations

  let statusVariant: "success" | "warning" | "destructive" | "info" | "muted" = "info";
  switch (item.status) {
    case "In Stock":
      statusVariant = "success";
      break;
    case "Low Stock":
      statusVariant = "warning";
      break;
    case "Out of Stock":
      statusVariant = "destructive";
      break;
  }

  const getLocationDisplayName = (fullLocationString: string) => {
    const foundLoc = structuredLocations.find(loc => loc.fullLocationString === fullLocationString);
    return foundLoc?.displayName || fullLocationString;
  };

  return (
    <Card className="group relative bg-card border-border rounded-lg shadow-sm overflow-hidden transition-all duration-200 hover:shadow-lg flex flex-col aspect-square">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between flex-shrink-0">
        <CardTitle className="text-base font-semibold text-foreground truncate">
          {item.name}
        </CardTitle>
        <Package className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow flex flex-col justify-between">
        {isSidebarCollapsed && (
          <div className="flex items-center justify-center h-24 bg-muted/30 rounded-md mb-3 overflow-hidden flex-shrink-0">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <img
                src="/placeholder.svg"
                alt={item.name}
                className="h-16 w-16 object-contain text-muted-foreground"
              />
            )}
          </div>
        )}
        <div className="text-sm text-muted-foreground mb-2 flex-shrink-0">
          <p className="flex items-center gap-1">
            <Tag className="h-3 w-3" /> SKU: {item.sku}
          </p>
          <p className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Location: {getLocationDisplayName(item.location)}
          </p>
        </div>
        <div className="flex items-baseline justify-between mt-3 flex-shrink-0">
          <span className="text-4xl font-bold text-foreground">{item.quantity}</span>
          <Badge variant={statusVariant}>
            {item.status}
          </Badge>
        </div>
        {/* REMOVED: QR code display */}
        {/* {qrCodeSvg && (
          <div className="mt-2 flex justify-center flex-shrink-0 p-2 bg-white rounded-md">
            <div dangerouslySetInnerHTML={{ __html: qrCodeSvg }} className="w-12 h-12 object-contain" />
          </div>
        )} */}
      </CardContent>

      {/* Quick Actions Overlay */}
      <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-4 space-y-2">
        <Button className="w-full" onClick={() => onAdjustStock(item)}>
          <PlusCircle className="h-4 w-4 mr-2" /> Adjust Stock
        </Button>
        <Button variant="outline" className="w-full" onClick={() => onCreateOrder(item)}>
          <MinusCircle className="h-4 w-4 mr-2" /> Create Order
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => onViewDetails(item)}>
          <Eye className="h-4 w-4 mr-2" /> View Details
        </Button>
        <Button variant="destructive" className="w-full" onClick={() => onDeleteItem(item.id, item.name)}>
          <Trash2 className="h-4 w-4 mr-2" /> Delete
        </Button>
      </div>
    </Card>
  );
};

export default InventoryCard;