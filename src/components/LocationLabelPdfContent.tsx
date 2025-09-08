import React from "react";
import { format, isValid } from "date-fns";
import { parseAndValidateDate } from "@/utils/dateUtils";
import { Diamond } from "lucide-react";

interface LocationLabelPdfContentProps {
  area: string;
  row: string;
  bay: string;
  level: string;
  pos: string;
  color: string; // NEW: Add color prop
  qrCodeSvg: string; // SVG string for the QR code
  printDate: string;
  locationString: string; // The full string encoded in QR code
  className?: string;
}

const LocationLabelPdfContent = React.forwardRef<HTMLDivElement, LocationLabelPdfContentProps>(({
  area,
  row,
  bay,
  level,
  pos,
  color, // NEW: Destructure color
  qrCodeSvg,
  printDate,
  locationString,
  className,
}, ref) => {
  return (
    <div ref={ref} className={`bg-white text-gray-900 font-sans w-[101.6mm] h-[50.8mm] border border-black relative overflow-hidden ${className || ''}`}>
      {/* QR Code at the top left */}
      <div className="absolute top-[2mm] left-[2mm] w-[45mm] h-[45mm] flex items-center justify-center z-0 p-1 bg-white">
        <div dangerouslySetInnerHTML={{ __html: qrCodeSvg }} className="w-full h-full object-contain" />
      </div>

      {/* Diamond Icon at the top right */}
      <div className="absolute top-[2mm] right-[2mm] z-10">
        <Diamond className="h-6 w-6 text-gray-700" />
      </div>

      {/* Location Details - positioned on the right side of the label */}
      <div className="absolute top-[2mm] right-[2mm] w-[50mm] h-[45mm] flex flex-col justify-center items-center z-10">
        {/* Row for Area and Row */}
        <div className="flex w-full justify-around mb-1">
          <div className="flex flex-col items-center leading-none">
            <span className="text-[0.6rem] font-bold uppercase text-gray-700">AREA</span>
            <span className="text-3xl font-extrabold text-black">{area}</span>
          </div>
          <div className="flex flex-col items-center leading-none">
            <span className="text-[0.6rem] font-bold uppercase text-gray-700">ROW</span>
            <span className="text-3xl font-extrabold text-black">{row}</span>
          </div>
        </div>
        {/* Row for Bay, Level, Pos */}
        <div className="flex w-full justify-around">
          <div className="flex flex-col items-center leading-none">
            <span className="text-[0.6rem] font-bold uppercase text-gray-700">BAY</span>
            <span className="text-3xl font-extrabold text-black">{bay}</span>
          </div>
          <div className="flex flex-col items-center leading-none">
            <span className="text-[0.6rem] font-bold uppercase text-gray-700">LEVEL</span>
            <span className="text-3xl font-extrabold text-white px-2 rounded-sm" style={{ backgroundColor: color }}>{level}</span> {/* NEW: Apply color here */}
          </div>
          <div className="flex flex-col items-center leading-none">
            <span className="text-[0.6rem] font-bold uppercase text-gray-700">POS</span>
            <span className="text-3xl font-extrabold text-black">{pos}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

LocationLabelPdfContent.displayName = "LocationLabelPdfContent";

export default LocationLabelPdfContent;