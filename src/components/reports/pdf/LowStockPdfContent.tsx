import React from "react";
import { format, isValid } from "date-fns"; // Import isValid
import { InventoryItem } from "@/context/InventoryContext";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate
import { DateRange } from "react-day-picker"; // NEW: Import DateRange
import { Location } from "@/context/OnboardingContext"; // NEW: Import Location interface
import { useProfile } from "@/context/ProfileContext"; // NEW: Import useProfile

interface LowStockPdfContentProps {
  // REMOVED: companyName: string;
  // REMOVED: companyAddress: string;
  // REMOVED: companyContact: string;
  companyLogoUrl?: string;
  reportDate: string;
  items: InventoryItem[];
  statusFilter: "all" | "low-stock" | "out-of-stock";
  dateRange?: DateRange; // NEW: Add dateRange prop
  structuredLocations: Location[]; // NEW: Add structuredLocations prop
}

const LowStockPdfContent: React.FC<LowStockPdfContentProps> = ({
  // REMOVED: companyName,
  // REMOVED: companyAddress,
  // REMOVED: companyContact,
  companyLogoUrl,
  reportDate,
  items,
  statusFilter,
  dateRange, // NEW: Destructure dateRange
  structuredLocations, // NEW: Destructure structuredLocations
}) => {
  const { profile } = useProfile(); // NEW: Get profile from ProfileContext

  const formattedDateRange = (dateRange?.from && isValid(dateRange.from))
    ? `${format(dateRange.from, "MMM dd, yyyy")} - ${dateRange.to && isValid(dateRange.to) ? format(dateRange.to, "MMM dd, yyyy") : format(dateRange.from, "MMM dd, yyyy")}`
    : "All Time";

  const reportTitle = statusFilter === "low-stock"
    ? "LOW STOCK ITEMS"
    : statusFilter === "out-of-stock"
      ? "OUT OF STOCK ITEMS"
      : "LOW & OUT OF STOCK ITEMS";

  const getLocationDisplayName = (fullLocationString: string) => {
    const foundLoc = structuredLocations.find(loc => loc.fullLocationString === fullLocationString);
    return foundLoc?.displayName || fullLocationString;
  };

  return (
    <div className="bg-white text-gray-900 font-sans text-sm p-[20mm]">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          {companyLogoUrl ? (
            <img src={companyLogoUrl} alt="Company Logo" className="max-h-20 object-contain mb-2" style={{ maxWidth: '1.5in' }} />
          ) : (
            // Removed "YOUR LOGO" placeholder
            <div className="max-h-20 mb-2" style={{ maxWidth: '1.5in' }}></div>
          )}
          <h1 className="text-5xl font-extrabold uppercase tracking-tight mb-2">
            {reportTitle}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">REPORT DATE: {parseAndValidateDate(reportDate) ? format(parseAndValidateDate(reportDate)!, "MMM dd, yyyy HH:mm") : "N/A"}</p>
          <p className="text-sm font-semibold">DATA PERIOD: {formattedDateRange}</p> {/* NEW: Display data period */}
        </div>
      </div>

      {/* Company Info */}
      <div className="mb-8">
        <p className="font-bold mb-2">REPORT FOR:</p>
        <div className="bg-gray-50 p-3 border border-gray-200 rounded">
          <p className="font-semibold">{profile?.companyName || "Your Company"}</p> {/* NEW: Use from profile */}
          <p>{profile?.companyCurrency || "N/A"}</p> {/* NEW: Use from profile */}
          <p>{profile?.companyAddress?.split('\n')[0] || "N/A"}</p> {/* NEW: Use from profile */}
          <p>{profile?.companyAddress?.split('\n')[1] || ""}</p> {/* NEW: Use from profile */}
        </div>
      </div>

      {/* Summary */}
      <div className="mb-8">
        <p className="font-bold mb-2">SUMMARY:</p>
        <div className="bg-gray-50 p-3 border border-gray-200 rounded">
          <p className="font-semibold">Total {reportTitle} Items: {items.length}</p>
          <p className="text-xs text-gray-600 mt-1">
            This report lists inventory items that are currently at or below their reorder level, or completely out of stock.
          </p>
        </div>
      </div>

      {/* Detailed Items Table */}
      <div className="mb-8">
        <p className="font-bold mb-2">DETAILED ITEMS:</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border border-gray-300">
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Item Name</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">SKU</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Quantity</th>
              <th className="py-2 px-4 text-right font-semibold">Reorder Level</th>
              <th className="py-2 px-4 text-left font-semibold">Location</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id} className="border-b border-gray-200">
                  <td className="py-2 px-4 border-r border-gray-200">{item.name}</td>
                  <td className="py-2 px-4 border-r border-gray-200">{item.sku}</td>
                  <td className="py-2 px-4 text-right border-r border-gray-200 text-red-600">{item.quantity}</td>
                  <td className="py-2 px-4 text-right">{item.reorderLevel}</td>
                  <td className="py-2 px-4">{getLocationDisplayName(item.location)}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-200">
                <td colSpan={5} className="py-2 px-4 text-center text-gray-600">No items found for this report.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 mt-12 text-right">
        <p>Generated by Fortress on {parseAndValidateDate(reportDate) ? format(parseAndValidateDate(reportDate)!, "MMM dd, yyyy HH:mm") : "N/A"}</p>
      </div>
    </div>
  );
};

export default LowStockPdfContent;