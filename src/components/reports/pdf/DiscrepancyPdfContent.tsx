import React from "react";
import { format, isValid } from "date-fns"; // Import isValid
import { UserProfile } from "@/context/ProfileContext";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate
import { DateRange } from "react-day-picker"; // NEW: Import DateRange
import { Location } from "@/context/OnboardingContext"; // NEW: Import Location interface
import { useProfile } from "@/context/ProfileContext"; // NEW: Import useProfile

interface DiscrepancyLog {
  id: string;
  timestamp: string;
  userId: string;
  organizationId: string;
  itemId: string;
  itemName: string;
  locationString: string; // This is the fullLocationString
  locationType: string;
  originalQuantity: number;
  countedQuantity: number;
  difference: number;
  reason: string;
  status: string;
}

interface DiscrepancyPdfContentProps {
  // REMOVED: companyName: string;
  // REMOVED: companyAddress: string;
  // REMOVED: companyContact: string;
  companyLogoUrl?: string; // Keep this prop for now, as it's passed explicitly
  reportDate: string;
  discrepancies: DiscrepancyLog[];
  statusFilter: "all" | "pending" | "resolved";
  dateRange?: DateRange; // NEW: Add dateRange prop
  allProfiles: UserProfile[];
  structuredLocations: Location[]; // NEW: Add structuredLocations prop
}

const DiscrepancyPdfContent: React.FC<DiscrepancyPdfContentProps> = ({
  // REMOVED: companyName,
  // REMOVED: companyAddress,
  // REMOVED: companyContact,
  companyLogoUrl, // Keep this prop for now, as it's passed explicitly
  reportDate,
  discrepancies,
  statusFilter,
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

  const reportTitle = statusFilter === "pending"
    ? "PENDING STOCK DISCREPANCIES"
    : statusFilter === "resolved"
      ? "RESOLVED STOCK DISCREPANCIES"
      : "STOCK DISCREPANCY REPORT";

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
          <p className="font-semibold">Total {reportTitle} Records: {discrepancies.length}</p>
          <p className="text-xs text-gray-600 mt-1">
            This report details all recorded stock discrepancies, including original vs. counted quantities and reasons.
          </p>
        </div>
      </div>

      {/* Detailed Discrepancies Table */}
      <div className="mb-8">
        <p className="font-bold mb-2">DETAILED DISCREPANCIES:</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border border-gray-300">
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Item Name</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Location</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Original Qty</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Counted Qty</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Diff</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Reason</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Status</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Reported By</th>
              <th className="py-2 px-4 text-left font-semibold">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {discrepancies.length > 0 ? (
              discrepancies.map((discrepancy) => {
                const discrepancyTimestamp = parseAndValidateDate(discrepancy.timestamp);
                return (
                  <tr key={discrepancy.id} className="border-b border-gray-200">
                    <td className="py-2 px-4 border-r border-gray-200">{discrepancy.itemName}</td>
                    <td className="py-2 px-4 border-r border-gray-200">{getLocationDisplayName(discrepancy.locationString)} ({discrepancy.locationType.replace('_', ' ')})</td>
                    <td className="py-2 px-4 text-right border-r border-gray-200">{discrepancy.originalQuantity}</td>
                    <td className="py-2 px-4 text-right border-r border-gray-200">{discrepancy.countedQuantity}</td>
                    <td className="py-2 px-4 text-right border-r border-gray-200 text-red-600">{discrepancy.difference}</td>
                    <td className="py-2 px-4 border-r border-gray-200">{discrepancy.reason}</td>
                    <td className="py-2 px-4 border-r border-gray-200">{discrepancy.status}</td>
                    <td className="py-2 px-4 border-r border-gray-200">{getUserName(discrepancy.userId)}</td>
                    <td className="py-2 px-4">{discrepancyTimestamp ? format(discrepancyTimestamp, "MMM dd, yyyy HH:mm") : "N/A"}</td>
                  </tr>
                );
              })
            ) : (
              <tr className="border-b border-gray-200">
                <td colSpan={9} className="py-2 px-4 text-center text-gray-600">No discrepancies found for this report.</td>
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

export default DiscrepancyPdfContent;