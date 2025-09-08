import React from "react";
import { format, isValid } from "date-fns"; // Import isValid
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate
import { DateRange } from "react-day-picker"; // NEW: Import DateRange
import { useProfile } from "@/context/ProfileContext"; // NEW: Import useProfile

interface ProfitabilityMetricsData {
  name: string;
  value: number;
  color: string;
}

interface ProfitabilityPdfContentProps {
  // REMOVED: companyName: string;
  // REMOVED: companyAddress: string;
  // REMOVED: companyContact: string;
  companyLogoUrl?: string;
  reportDate: string;
  metricsData: ProfitabilityMetricsData[];
  totalSalesRevenue: number;
  totalCostOfGoodsSold: number;
  dateRange?: DateRange; // NEW: Add dateRange prop
}

const ProfitabilityPdfContent: React.FC<ProfitabilityPdfContentProps> = ({
  // REMOVED: companyName,
  // REMOVED: companyAddress,
  // REMOVED: companyContact,
  companyLogoUrl,
  reportDate,
  metricsData,
  totalSalesRevenue,
  totalCostOfGoodsSold,
  dateRange, // NEW: Destructure dateRange
}) => {
  const { profile } = useProfile(); // NEW: Get profile from ProfileContext

  const formattedDateRange = (dateRange?.from && isValid(dateRange.from))
    ? `${format(dateRange.from, "MMM dd, yyyy")} - ${dateRange.to && isValid(dateRange.to) ? format(dateRange.to, "MMM dd, yyyy") : format(dateRange.from, "MMM dd, yyyy")}`
    : "All Time";

  const grossProfit = totalSalesRevenue - totalCostOfGoodsSold;

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
            PROFITABILITY REPORT
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

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="font-bold mb-2">FINANCIAL SUMMARY:</p>
          <div className="bg-gray-50 p-3 border border-gray-200 rounded space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Total Sales Revenue:</span>
              <span>${totalSalesRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Total Cost of Goods Sold:</span>
              <span>${totalCostOfGoodsSold.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Gross Profit:</span>
              <span>${grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {metricsData.map((metric, index) => (
              <div key={index} className="flex justify-between">
                <span className="font-semibold">{metric.name}:</span>
                <span>{metric.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Metrics Table (if applicable, or just list key metrics) */}
      <div className="mb-8">
        <p className="font-bold mb-2">PROFITABILITY METRICS:</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border border-gray-300">
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Metric</th>
              <th className="py-2 px-4 text-right font-semibold">Value (%)</th>
            </tr>
          </thead>
          <tbody>
            {metricsData.length > 0 ? (
              metricsData.map((metric, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-2 px-4 border-r border-gray-200">{metric.name}</td>
                  <td className="py-2 px-4 text-right">{metric.value.toFixed(1)}%</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-200">
                <td colSpan={2} className="py-2 px-4 text-center text-gray-600">No profitability metrics available for this report.</td>
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

export default ProfitabilityPdfContent;