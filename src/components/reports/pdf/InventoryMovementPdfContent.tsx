import React from "react";
import { format, isValid } from "date-fns"; // Import isValid
import { StockMovement } from "@/context/StockMovementContext";
import { UserProfile } from "@/context/ProfileContext";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate
import { DateRange } from "react-day-picker"; // NEW: Import DateRange
import { Location } from "@/context/OnboardingContext"; // NEW: Import Location interface
import { useProfile } from "@/context/ProfileContext"; // NEW: Import useProfile

interface InventoryMovementPdfContentProps {
  // REMOVED: companyName: string;
  // REMOVED: companyAddress: string;
  // REMOVED: companyContact: string;
  companyLogoUrl?: string; // Keep this prop for now, as it's passed explicitly
  reportDate: string;
  movements: StockMovement[];
  dateRange?: DateRange; // NEW: Add dateRange prop
  allProfiles: UserProfile[];
  structuredLocations: Location[]; // NEW: Add structuredLocations prop
}

const InventoryMovementPdfContent: React.FC<InventoryMovementPdfContentProps> = ({
  // REMOVED: companyName,
  // REMOVED: companyAddress,
  // REMOVED: companyContact,
  companyLogoUrl, // Keep this prop for now, as it's passed explicitly
  reportDate,
  movements,
  dateRange, // NEW: Destructure dateRange
  allProfiles,
  structuredLocations, // NEW: Destructure structuredLocations
}) => {
  const { profile } = useProfile(); // NEW: Get profile from ProfileContext

  if (!profile) {
    return <div className="text-center text-red-500">Error: Company profile not loaded.</div>;
  }

  const formattedDateRange = (dateRange?.from && isValid(dateRange.from))
    ? `${format(dateRange.from, "MMM dd, yyyy")} - ${dateRange.to && isValid(dateRange.to) ? format(dateRange.to, "MMM dd, yyyy") : format(dateRange.from, "MMM dd, yyyy")}`
    : "All Time";

  const getUserName = (userId: string) => {
    const user = allProfiles.find(p => p.id === userId);
    return user?.fullName || user?.email || "Unknown User";
  };

  const getLocationDisplayName = (fullLocationString: string) => {
    const foundLoc = structuredLocations.find(loc => loc.fullLocationString === fullLocationString);
    return foundLoc?.displayName || fullLocationString;
  };

  return (
    <div className="bg-white text-gray-900 font-sans text-sm p-[20mm]">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          {profile.companyLogoUrl ? ( // Use profile.companyLogoUrl
            <img src={profile.companyLogoUrl} alt="Company Logo" className="max-h-20 object-contain mb-2" style={{ maxWidth: '1.5in' }} />
          ) : (
            // Removed "YOUR LOGO" placeholder
            <div className="max-h-20 mb-2" style={{ maxWidth: '1.5in' }}></div>
          )}
          <h1 className="text-5xl font-extrabold uppercase tracking-tight mb-2">
            INVENTORY MOVEMENT
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
          <p className="font-semibold">{profile.companyName || "Your Company"}</p> {/* NEW: Use from profile */}
          <p>{profile.companyCurrency || "N/A"}</p> {/* NEW: Use from profile */}
          <p>{profile.companyAddress?.split('\n')[0] || "N/A"}</p> {/* NEW: Use from profile */}
          <p>{profile.companyAddress?.split('\n')[1] || ""}</p> {/* NEW: Use from profile */}
        </div>
      </div>

      {/* Summary */}
      <div className="mb-8">
        <p className="font-bold mb-2">SUMMARY:</p>
        <div className="bg-gray-50 p-3 border border-gray-200 rounded">
          <p className="font-semibold">Total Movements: {movements.length}</p>
          <p className="text-xs text-gray-600 mt-1">
            This report details all recorded stock movements, including additions, subtractions, and reasons.
          </p>
        </div>
      </div>

      {/* Detailed Movements Table */}
      <div className="mb-8">
        <p className="font-bold mb-2">DETAILED MOVEMENTS:</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border border-gray-300">
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Item Name</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Type</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Amount</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Old Qty</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">New Qty</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Reason</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">User</th>
              <th className="py-2 px-4 text-left font-semibold">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {movements.length > 0 ? (
              movements.map((movement) => {
                const movementTimestamp = parseAndValidateDate(movement.timestamp);
                return (
                  <tr key={movement.id} className="border-b border-gray-200">
                    <td className="py-2 px-4 border-r border-gray-200">{movement.itemName}</td>
                    <td className="py-2 px-4 border-r border-gray-200">{movement.type}</td>
                    <td className="py-2 px-4 text-right border-r border-gray-200">{movement.amount}</td>
                    <td className="py-2 px-4 text-right border-r border-gray-200">{movement.oldQuantity}</td>
                    <td className="py-2 px-4 text-right border-r border-gray-200">{movement.newQuantity}</td>
                    <td className="py-2 px-4 border-r border-gray-200">{movement.reason}</td>
                    <td className="py-2 px-4 border-r border-gray-200">{getUserName(movement.userId)}</td>
                    <td className="py-2 px-4">{movementTimestamp ? format(movementTimestamp, "MMM dd, yyyy HH:mm") : "N/A"}</td>
                  </tr>
                );
              })
            ) : (
              <tr className="border-b border-gray-200">
                <td colSpan={8} className="py-2 px-4 text-center text-gray-600">No inventory movements found for this report.</td>
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

export default InventoryMovementPdfContent;