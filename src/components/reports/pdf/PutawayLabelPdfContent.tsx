import React from "react";
import { format, isValid } from "date-fns"; // Import isValid
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate
import { Location } from "@/context/OnboardingContext"; // NEW: Import Location interface

interface PutawayLabelPdfContentProps {
  itemName: string;
  itemSku: string;
  receivedQuantity: number;
  suggestedLocation: string; // This is the fullLocationString
  lotNumber?: string;
  expirationDate?: string;
  serialNumber?: string; // Added for future use, but not actively populated in this iteration
  qrCodeSvg: string; // SVG string for the QR code
  printDate: string;
  structuredLocations: Location[]; // NEW: Add structuredLocations prop
}

const PutawayLabelPdfContent: React.FC<PutawayLabelPdfContentProps> = ({
  itemName,
  itemSku,
  receivedQuantity,
  suggestedLocation,
  lotNumber,
  expirationDate,
  serialNumber,
  qrCodeSvg,
  printDate,
  structuredLocations, // NEW: Destructure structuredLocations
}) => {
  const expirationDateObj = expirationDate ? parseAndValidateDate(expirationDate) : null;
  const printDateObj = parseAndValidateDate(printDate);

  const getLocationDisplayName = (fullLocationString: string) => {
    const foundLoc = structuredLocations.find(loc => loc.fullLocationString === fullLocationString);
    return foundLoc?.displayName || fullLocationString;
  };

  return (
    <div className="bg-white text-gray-900 font-sans text-xs p-2 w-[50mm] h-[50mm] border border-black flex flex-col overflow-hidden">
      {/* QR Code at the top */}
      <div className="flex justify-center mb-1 flex-shrink-0 p-1 bg-white">
        <div dangerouslySetInnerHTML={{ __html: qrCodeSvg }} className="w-[25mm] h-[25mm] object-contain" />
      </div>

      {/* Item Name */}
      <p className="font-bold text-sm text-center mb-1 leading-tight flex-shrink-0 truncate">{itemName}</p>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[0.6rem] flex-grow overflow-hidden">
        <div>
          <span className="font-bold">SKU:</span> {itemSku}
        </div>
        <div>
          <span className="font-bold">Qty:</span> {receivedQuantity}
        </div>
        {lotNumber && (
          <div>
            <span className="font-bold">Lot:</span> {lotNumber}
          </div>
        )}
        {expirationDateObj && isValid(expirationDateObj) && (
          <div>
            <span className="font-bold">Exp:</span> {format(expirationDateObj, "MM/yy")}
          </div>
        )}
        {serialNumber && ( // Placeholder for serial number
          <div>
            <span className="font-bold">SN:</span> {serialNumber}
          </div>
        )}
        <div className="col-span-2">
          <span className="font-bold">Loc:</span> <span className="text-blue-700 font-extrabold">{getLocationDisplayName(suggestedLocation)}</span>
        </div>
      </div>

      {/* Footer Date */}
      <div className="text-right text-[0.5rem] mt-1 flex-shrink-0">
        Date: {printDateObj && isValid(printDateObj) ? format(printDateObj, "MMM dd, yyyy HH:mm") : "N/A"}
      </div>
    </div>
  );
};

export default PutawayLabelPdfContent;