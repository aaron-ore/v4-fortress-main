import React from "react";
import { InventoryItem } from "@/context/InventoryContext";
import { OrderItem } from "@/context/OrdersContext";
import { format, isValid } from "date-fns"; // Import isValid
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate
import { DateRange } from "react-day-picker"; // NEW: Import DateRange
import { useProfile } from "@/context/ProfileContext"; // NEW: Import useProfile

interface DashboardSummaryPdfContentProps {
  // REMOVED: companyName: string;
  // REMOVED: companyAddress: string;
  // REMOVED: companyContact: string;
  companyLogoUrl?: string; // Keep this prop for now, as it's passed explicitly
  reportDate: string;
  totalStockValue: number;
  totalUnitsOnHand: number;
  lowStockItems: InventoryItem[];
  outOfStockItems: InventoryItem[];
  recentSalesOrders: OrderItem[];
  recentPurchaseOrders: OrderItem[];
  dateRange?: DateRange; // NEW: Add dateRange prop
}

const DashboardSummaryPdfContent: React.FC<DashboardSummaryPdfContentProps> = ({
  // REMOVED: companyName,
  // REMOVED: companyAddress,
  // REMOVED: companyContact,
  companyLogoUrl, // Keep this prop for now, as it's passed explicitly
  reportDate,
  totalStockValue,
  totalUnitsOnHand,
  lowStockItems,
  outOfStockItems,
  recentSalesOrders,
  recentPurchaseOrders,
  dateRange, // NEW: Destructure dateRange
}) => {
  const { profile } = useProfile(); // NEW: Get profile from ProfileContext

  if (!profile) {
    return <div className="text-center text-red-500">Error: Company profile not loaded.</div>;
  }

  const formattedDateRange = (dateRange?.from && isValid(dateRange.from))
    ? `${format(dateRange.from, "MMM dd, yyyy")} - ${dateRange.to && isValid(dateRange.to) ? format(dateRange.to, "MMM dd, yyyy") : format(dateRange.from, "MMM dd, yyyy")}`
    : "All Time";

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
            DASHBOARD SUMMARY
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

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="font-bold mb-2">INVENTORY OVERVIEW:</p>
          <div className="bg-gray-50 p-3 border border-gray-200 rounded space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Total Stock Value:</span>
              <span>${totalStockValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Total Units On Hand:</span>
              <span>{totalUnitsOnHand.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className={lowStockItems.length > 0 ? "font-semibold text-red-600" : "font-semibold"}>Low Stock Items:</span>
              <span className={lowStockItems.length > 0 ? "text-red-600" : ""}>{lowStockItems.length}</span>
            </div>
            <div className="flex justify-between">
              <span className={outOfStockItems.length > 0 ? "font-semibold text-red-600" : "font-semibold"}>Out-of-Stock Items:</span>
              <span className={outOfStockItems.length > 0 ? "text-red-600" : ""}>{outOfStockItems.length}</span>
            </div>
          </div>
        </div>
        <div>
          <p className="font-bold mb-2">RECENT ORDERS:</p>
          <div className="bg-gray-50 p-3 border border-gray-200 rounded space-y-2">
            <p className="font-semibold">Recent Sales Orders:</p>
            {recentSalesOrders.length > 0 ? (
              <ul className="list-disc list-inside ml-4">
                {recentSalesOrders.map(order => (
                  <li key={order.id}>{order.id} - {order.customerSupplier} (${order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 ml-4">No recent sales orders.</p>
            )}
            <p className="font-semibold mt-4">Recent Purchase Orders:</p>
            {recentPurchaseOrders.length > 0 ? (
              <ul className="list-disc list-inside ml-4">
                {recentPurchaseOrders.map(order => (
                  <li key={order.id}>{order.id} - {order.customerSupplier} (${order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 ml-4">No recent purchase orders.</p>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Low Stock Items */}
      <div className="mb-8">
        <p className="font-bold mb-2">LOW STOCK ITEMS:</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border border-gray-300">
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Item Name</th>
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">SKU</th>
              <th className="py-2 px-4 text-right font-semibold border-r border-gray-300">On Hand</th>
              <th className="py-2 px-4 text-right font-semibold">Reorder Level</th>
            </tr>
          </thead>
          <tbody>
            {lowStockItems.length > 0 ? (
              lowStockItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-200">
                  <td className="py-2 px-4 border-r border-gray-200">{item.name}</td>
                  <td className="py-2 px-4 border-r border-gray-200">{item.sku}</td>
                  <td className="py-2 px-4 text-right border-r border-gray-200 text-red-600">{item.quantity}</td>
                  <td className="py-2 px-4 text-right">{item.reorderLevel}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-200">
                <td colSpan={4} className="py-2 px-4 text-center text-gray-600">No low stock items.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detailed Out-of-Stock Items */}
      <div className="mb-8">
        <p className="font-bold mb-2">OUT-OF-STOCK ITEMS:</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border border-gray-300">
              <th className="py-2 px-4 text-left font-semibold border-r border-gray-300">Item Name</th>
              <th className="py-2 px-4 text-left font-semibold">SKU</th>
            </tr>
          </thead>
          <tbody>
            {outOfStockItems.length > 0 ? (
              outOfStockItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-200">
                  <td className="py-2 px-4 border-r border-gray-200">{item.name}</td>
                  <td className="py-2 px-4">{item.sku}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-200">
                <td colSpan={2} className="py-2 px-4 text-center text-gray-600">No out of stock items.</td>
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

export default DashboardSummaryPdfContent;