import React from "react";
import { format, isValid } from "date-fns"; // Import isValid
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

interface ForecastDataPoint {
  name: string; // Month name
  "Historical Demand": number;
  "Forecasted Demand": number;
  "Upper Confidence": number;
  "Lower Confidence": number;
  "External Factor (Trend)": number;
}

interface AdvancedDemandForecastPdfContentProps {
  companyName: string;
  companyAddress: string;
  companyContact: string; // e.g., currency or main contact
  companyLogoUrl?: string;
  reportDate: string;
  forecastData: ForecastDataPoint[];
  selectedItemName: string;
}

const AdvancedDemandForecastPdfContent: React.FC<AdvancedDemandForecastPdfContentProps> = ({
  companyName,
  companyAddress,
  companyContact,
  companyLogoUrl,
  reportDate,
  forecastData,
  selectedItemName,
}) => {
  // dateRange is not directly used here, but if it were, it would need isValid checks.
  // For now, assuming reportDate is the primary date for this PDF.

  return (
    <div className="bg-white text-gray-900 font-sans text-sm p-[20mm]">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          {companyLogoUrl ? (
            <img src={companyLogoUrl} alt="Company Logo" className="max-h-20 object-contain mb-2" style={{ maxWidth: '1.5in' }} />
          ) : (
            <div className="text-xs text-gray-600 mb-1">YOUR LOGO</div>
          )}
          <h1 className="text-5xl font-extrabold uppercase tracking-tight mb-2">
            DEMAND FORECAST
          </h1>
          <p className="text-lg font-semibold text-gray-700">
            {selectedItemName === "All Items" ? "Overall Inventory" : `For: ${selectedItemName}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">REPORT DATE: {parseAndValidateDate(reportDate) && isValid(parseAndValidateDate(reportDate)!) ? format(parseAndValidateDate(reportDate)!, "MMM dd, yyyy HH:mm") : "N/A"}</p>
        </div>
      </div>

      {/* Company Info */}
      <div className="mb-8">
        <p className="font-bold mb-2">REPORT FOR:</p>
        <div className="bg-gray-50 p-3 border border-gray-200 rounded">
          <p className="font-semibold">{companyName}</p>
          <p>{companyContact}</p>
          <p>{companyAddress.split('\n')[0]}</p>
          <p>{companyAddress.split('\n')[1]}</p>
        </div>
      </div>

      {/* Forecast Summary */}
      <div className="mb-8">
        <p className="font-bold mb-2">FORECAST SUMMARY:</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border border-gray-300">
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Month</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Historical Demand</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Forecasted Demand</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Lower Confidence</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Upper Confidence</th>
              <th className="py-2 px-4 text-right font-semibold">External Factor</th>
            </tr>
          </thead>
          <tbody>
            {forecastData.map((dataPoint, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="py-2 px-4 border-r border-gray-200">{dataPoint.name}</td>
                <td className="py-2 px-4 text-right border-r border-gray-200">{dataPoint["Historical Demand"] > 0 ? dataPoint["Historical Demand"].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</td>
                <td className="py-2 px-4 text-right border-r border-gray-200">{dataPoint["Forecasted Demand"] > 0 ? dataPoint["Forecasted Demand"].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</td>
                <td className="py-2 px-4 text-right border-r border-gray-200">{dataPoint["Lower Confidence"] > 0 ? dataPoint["Lower Confidence"].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</td>
                <td className="py-2 px-4 text-right border-r border-gray-200">{dataPoint["Upper Confidence"] > 0 ? dataPoint["Upper Confidence"].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</td>
                <td className="py-2 px-4 text-right">{dataPoint["External Factor (Trend)"] > 0 ? dataPoint["External Factor (Trend)"].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes/Disclaimer */}
      <div className="text-xs text-gray-600 mt-12">
        <p className="font-bold mb-1">Notes:</p>
        <p>
          This report provides an advanced demand forecast based on historical sales data, simulated seasonality, and external market trends.
          The confidence intervals indicate the probable range of future demand. External factors are simulated for demonstration.
          For critical business decisions, always cross-reference with real-time market intelligence.
        </p>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 mt-12 text-right">
        <p>Generated by Fortress on {parseAndValidateDate(reportDate) && isValid(parseAndValidateDate(reportDate)!) ? format(parseAndValidateDate(reportDate)!, "MMM dd, yyyy HH:mm") : "N/A"}</p>
      </div>
    </div>
  );
};

export default AdvancedDemandForecastPdfContent;