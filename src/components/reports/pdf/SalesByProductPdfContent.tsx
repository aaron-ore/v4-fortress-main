import React from "react";
import { format, isValid } from "date-fns"; // Import isValid
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate
import { DateRange } from "react-day-picker"; // NEW: Import DateRange
import { useProfile } from "@/context/ProfileContext"; // NEW: Import useProfile

interface ProductSalesData {
  productName: string;
  sku: string;
  category: string;
  unitsSold: number;
  totalRevenue: number;
}

interface SalesByProductPdfContentProps {
  // REMOVED: companyName: string;
  // REMOVED: companyAddress: string;
  // REMOVED: companyContact: string;
  companyLogoUrl?: string; // Keep this prop for now, as it's passed explicitly
  reportDate: string;
  productSales: ProductSalesData[];
  dateRange?: DateRange; // NEW: Add dateRange prop
}

const SalesByProductPdfContent: React.FC<SalesByProductPdfContentProps> = ({
  // REMOVED: companyName,
  // REMOVED: companyAddress,
  // REMOVED: companyContact,
  companyLogoUrl, // Keep this prop for now, as it's passed explicitly
  reportDate,
  productSales,
  dateRange, // NEW: Destructure dateRange
}) => {
  const { profile } = useProfile(); // NEW: Get profile from ProfileContext

  if (!profile) {
    return <div className="text-center text-red-500">Error: Company profile not loaded.</div>;
  }

  const formattedDateRange = (dateRange?.from && isValid(dateRange.from))
    ? `${format(dateRange.from, "MMM dd, yyyy")} - ${dateRange.to && isValid(dateRange.to) ? format(dateRange.to, "MMM dd, yyyy") : format(dateRange.from, "MMM dd, yyyy")}`
    : "All Time";

  const totalOverallRevenue = productSales.reduce((sum, data) => sum + data.totalRevenue, 0);
  const totalOverallUnits = productSales.reduce((sum, data) => sum + data.unitsSold, 0);

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
            SALES BY PRODUCT
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

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="font-bold mb-2">OVERALL SALES SUMMARY:</p>
          <div className="bg-gray-50 p-3 border border-gray-200 rounded space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Total Sales Revenue:</span>
              <span>${totalOverallRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Total Units Sold:</span>
              <span>{totalOverallUnits.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Number of Products:</span>
              <span>{productSales.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Data Table */}
      <div className="mb-8">
        <p className="font-bold mb-2">DETAILED SALES BY PRODUCT:</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border border-gray-300">
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Product Name</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">SKU</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Category</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">Units Sold</th>
              <th className="py-2 px-4 text-right font-semibold">Total Revenue</th>
            </tr>
          </thead>
          <tbody>
            {productSales.length > 0 ? (
              productSales.map((data, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-2 px-4 border-r border-gray-200">{data.productName}</td>
                  <td className="py-2 px-4 border-r border-gray-200">{data.sku}</td>
                  <td className="py-2 px-4 border-r border-gray-200">{data.category}</td>
                  <td className="py-2 px-4 text-right border-r border-gray-200">{data.unitsSold.toLocaleString()}</td>
                  <td className="py-2 px-4 text-right">${data.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-200">
                <td colSpan={5} className="py-2 px-4 text-center text-gray-600">No sales data available for this report.</td>
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

export default SalesByProductPdfContent;