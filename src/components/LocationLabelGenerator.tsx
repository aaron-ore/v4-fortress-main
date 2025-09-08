import React, { useState, useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, QrCode, Palette, Download, Save } from "lucide-react"; // NEW: Import Save icon
import { showError, showSuccess } from "@/utils/toast";
import { usePrint, PrintContentData } from "@/context/PrintContext";
import { useOnboarding, Location } from "@/context/OnboardingContext"; // NEW: Import Location interface
import { generateQrCodeSvg } from "@/utils/qrCodeGenerator";
import { format } from "date-fns";
import LocationLabelPdfContent from "@/components/LocationLabelPdfContent";
import html2canvas from 'html2canvas'; // NEW: Import html2canvas
import { parseLocationString, buildLocationString, getUniqueLocationParts, LocationParts } from "@/utils/locationParser"; // NEW

// Predefined colors for labels, matching some of the designs
const labelColors = [
  { name: "Green", hex: "#4CAF50" },
  { name: "Blue", hex: "#2196F3" },
  { name: "Purple", hex: "#9C27B0" },
  { name: "Yellow", hex: "#FFEB3B" },
  { name: "Red", hex: "#F44336" },
  { name: "Orange", hex: "#FF9800" },
];

interface LocationLabelGeneratorProps {
  initialLocation?: Location | null; // NEW: Pass full Location object
  onSave: (location: Omit<Location, 'id' | 'createdAt' | 'userId' | 'organizationId'>, isNew: boolean) => void; // NEW: onSave callback
  onClose: () => void; // NEW: onClose callback for the dialog
  onGenerateAndPrint?: (data: PrintContentData[]) => void; // Optional callback for external print
}

const LocationLabelGenerator: React.FC<LocationLabelGeneratorProps> = ({
  initialLocation, // NEW: Destructure initialLocation
  onSave,
  onClose,
  onGenerateAndPrint,
}) => {
  const { initiatePrint } = usePrint();
  const { locations: existingLocationsInContext } = useOnboarding(); // Get all existing locations from context

  const [displayName, setDisplayName] = useState(initialLocation?.displayName || ""); // NEW: State for display name
  const [area, setArea] = useState(initialLocation?.area || "A");
  const [row, setRow] = useState(initialLocation?.row || "01");
  const [bay, setBay] = useState(initialLocation?.bay || "01");
  const [level, setLevel] = useState(initialLocation?.level || "1");
  const [pos, setPos] = useState(initialLocation?.pos || "A");
  const [selectedColor, setSelectedColor] = useState(initialLocation?.color || labelColors[0].hex);
  const [quantity, setQuantity] = useState("1");
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);

  const labelPreviewRef = useRef<HTMLDivElement>(null);

  // Derived unique options for dropdowns from all existing locations
  const uniqueAreas = getUniqueLocationParts(existingLocationsInContext.map(loc => loc.fullLocationString), 'area');
  const uniqueRows = getUniqueLocationParts(existingLocationsInContext.map(loc => loc.fullLocationString), 'row');
  const uniqueBays = getUniqueLocationParts(existingLocationsInContext.map(loc => loc.fullLocationString), 'bay');
  const uniqueLevels = getUniqueLocationParts(existingLocationsInContext.map(loc => loc.fullLocationString), 'level');
  const uniquePositions = getUniqueLocationParts(existingLocationsInContext.map(loc => loc.fullLocationString), 'pos');

  // Update internal state when initial props change (e.g., when editing a different location)
  useEffect(() => {
    setDisplayName(initialLocation?.displayName || "");
    setArea(initialLocation?.area || "A");
    setRow(initialLocation?.row || "01");
    setBay(initialLocation?.bay || "01");
    setLevel(initialLocation?.level || "1");
    setPos(initialLocation?.pos || "A");
    setSelectedColor(initialLocation?.color || labelColors[0].hex);
    setQuantity("1"); // Reset quantity when editing a new item
  }, [initialLocation]);

  const fullLocationString = useMemo(() => {
    return buildLocationString({ area, row, bay, level, pos });
  }, [area, row, bay, level, pos]);

  // Generate QR code for preview
  useEffect(() => {
    const generatePreviewQr = async () => {
      if (fullLocationString) {
        try {
          const svg = await generateQrCodeSvg(fullLocationString, 150); 
          setQrCodeSvg(svg);
        } catch (error) {
          console.error("Error generating QR for preview:", error);
          setQrCodeSvg(null);
        }
      } else {
        setQrCodeSvg(null);
      }
    };
    generatePreviewQr();
  }, [fullLocationString]);

  const handleSaveLocationDetails = async () => {
    if (!area || !row || !bay || !level || !pos || !selectedColor) {
      showError("Please fill in all location details and select a color.");
      return;
    }

    const isNew = !initialLocation;

    // Check for duplicate fullLocationString (excluding the current item if editing)
    const duplicateExists = existingLocationsInContext.some(loc => 
      loc.fullLocationString.toLowerCase() === fullLocationString.toLowerCase() && 
      loc.id !== initialLocation?.id
    );

    if (duplicateExists) {
      showError(`A location with the identifier "${fullLocationString}" already exists. Please choose a unique identifier.`);
      return;
    }

    const locationData: Omit<Location, 'id' | 'createdAt' | 'userId' | 'organizationId'> = {
      fullLocationString,
      displayName: displayName.trim() || undefined,
      area,
      row,
      bay,
      level,
      pos,
      color: selectedColor,
    };

    onSave(locationData, isNew);
    onClose(); // Close the dialog after saving
  };

  const handleGenerateAndPrint = async () => {
    if (!area || !row || !bay || !level || !pos || !selectedColor || !quantity) {
      showError("Please fill in all location details and select a color.");
      return;
    }

    const numQuantity = parseInt(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0 || numQuantity > 100) {
      showError("Please enter a valid quantity between 1 and 100.");
      return;
    }

    // No need for duplication check here, as it's for printing labels, not saving the location itself.
    // The location should already be saved or be a temporary configuration.

    try {
      const qrSvg = await generateQrCodeSvg(fullLocationString, 150); // Generate QR for print

      const labelsToPrint: PrintContentData[] = Array.from({ length: numQuantity }).map(() => ({
        type: "location-label",
        props: {
          area,
          row,
          bay,
          level,
          pos,
          color: selectedColor,
          qrCodeSvg: qrSvg,
          printDate: format(new Date(), "MMM dd, yyyy HH:mm"),
          locationString: fullLocationString,
        },
      }));

      if (onGenerateAndPrint) {
        onGenerateAndPrint(labelsToPrint);
      } else {
        for (const label of labelsToPrint) {
          initiatePrint(label);
        }
        showSuccess(`Generated and sent ${numQuantity} location labels to printer!`);
      }
    } catch (error: any) {
      showError(`Failed to generate labels: ${error.message}`);
    }
  };

  // Handle Download as PNG
  const handleDownloadPng = async () => {
    if (!labelPreviewRef.current) {
      showError("No label preview available to download.");
      return;
    }

    try {
      const canvas = await html2canvas(labelPreviewRef.current, {
        scale: 3, // Increase scale for higher resolution PNG
        useCORS: true, // Enable CORS if images are from external sources
        backgroundColor: '#ffffff', // Ensure white background
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `location-label-${fullLocationString}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess("Label downloaded as PNG!");
    } catch (error: any) {
      console.error("Error downloading label as PNG:", error);
      showError(`Failed to download label as PNG: ${error.message}`);
    }
  };

  const isSaveDisabled = !fullLocationString || !selectedColor || !area || !row || !bay || !level || !pos;

  return (
    <div className="space-y-4 flex-grow flex flex-col p-4"> {/* Added padding to the content */}
      <div className="space-y-2">
        <Label htmlFor="displayName">Display Name (Optional)</Label>
        <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g., Main Warehouse" aria-label="Location Display Name" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="area">Area (e.g., A, B, C)</Label>
          <Select value={area} onValueChange={(val) => setArea(val)}>
            <SelectTrigger id="area" aria-label="Location Area"><SelectValue placeholder="Area" /></SelectTrigger>
            <SelectContent>
              {uniqueAreas.map(val => <SelectItem key={val} value={val}>{val}</SelectItem>)}
              <SelectItem value="A">A</SelectItem>
              <SelectItem value="B">B</SelectItem>
              <SelectItem value="C">C</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="row">Row (e.g., 01, 02)</Label>
          <Select value={row} onValueChange={(val) => setRow(val)}>
            <SelectTrigger id="row" aria-label="Location Row"><SelectValue placeholder="Row" /></SelectTrigger>
            <SelectContent>
              {uniqueRows.map(val => <SelectItem key={val} value={val}>{val}</SelectItem>)}
              <SelectItem value="01">01</SelectItem>
              <SelectItem value="02">02</SelectItem>
              <SelectItem value="03">03</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bay">Bay (e.g., 01, 02)</Label>
          <Select value={bay} onValueChange={(val) => setBay(val)}>
            <SelectTrigger id="bay" aria-label="Location Bay"><SelectValue placeholder="Bay" /></SelectTrigger>
            <SelectContent>
              {uniqueBays.map(val => <SelectItem key={val} value={val}>{val}</SelectItem>)}
              <SelectItem value="01">01</SelectItem>
              <SelectItem value="02">02</SelectItem>
              <SelectItem value="03">03</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="level">Level (e.g., 1, 2, 3)</Label>
          <Select value={level} onValueChange={(val) => setLevel(val)}>
            <SelectTrigger id="level" aria-label="Location Level"><SelectValue placeholder="Level" /></SelectTrigger>
            <SelectContent>
              {uniqueLevels.map(val => <SelectItem key={val} value={val}>{val}</SelectItem>)}
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pos">Position (e.g., A, B, C)</Label>
          <Select value={pos} onValueChange={(val) => setPos(val)}>
            <SelectTrigger id="pos" aria-label="Location Position"><SelectValue placeholder="Pos" /></SelectTrigger>
            <SelectContent>
              {uniquePositions.map(val => <SelectItem key={val} value={val}>{val}</SelectItem>)}
              <SelectItem value="A">A</SelectItem>
              <SelectItem value="B">B</SelectItem>
              <SelectItem value="C">C</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="color">Label Color</Label>
          <Select value={selectedColor} onValueChange={setSelectedColor}>
            <SelectTrigger id="color" aria-label="Select label color">
              <SelectValue placeholder="Select a color" />
            </SelectTrigger>
            <SelectContent>
              {labelColors.map((c) => (
                <SelectItem key={c.hex} value={c.hex}>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.hex }}></div>
                    {c.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="quantity">Number of Labels to Print (1-100)</Label>
        <Input
          id="quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="1"
          min="1"
          max="100"
          aria-label="Number of labels to print"
        />
      </div>

      <div className="flex-grow flex flex-col items-center justify-center min-h-[150px] border border-dashed border-muted-foreground/50 rounded-md p-2">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Label Preview</h3>
        {qrCodeSvg ? (
          <div className="w-[101.6mm] h-[50.8mm] flex items-center justify-center overflow-hidden p-1 bg-white">
            <LocationLabelPdfContent
              ref={labelPreviewRef}
              area={area}
              row={row}
              bay={bay}
              level={level}
              pos={pos}
              color={selectedColor}
              qrCodeSvg={qrCodeSvg}
              printDate={format(new Date(), "MMM dd, yyyy HH:mm")}
              locationString={fullLocationString}
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Enter details to see a preview.</p>
        )}
      </div>
      <div className="flex gap-2 w-full mt-auto">
        <Button onClick={handleSaveLocationDetails} className="flex-grow" disabled={isSaveDisabled}>
          <Save className="h-4 w-4 mr-2" /> {initialLocation ? "Save Changes" : "Save Location"}
        </Button>
        <Button onClick={handleGenerateAndPrint} className="flex-grow" variant="secondary" disabled={isSaveDisabled}>
          <Printer className="h-4 w-4 mr-2" /> Generate & Print Labels
        </Button>
        <Button onClick={handleDownloadPng} className="flex-grow" variant="outline" disabled={isSaveDisabled}>
          <Download className="h-4 w-4 mr-2" /> Download PNG
        </Button>
      </div>
    </div>
  );
};

export default LocationLabelGenerator;