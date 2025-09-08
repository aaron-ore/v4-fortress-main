import * as XLSX from 'xlsx';
import { showSuccess, showError } from "@/utils/toast";

interface ExportData {
  [key: string]: any;
}

export const exportToExcel = (data: ExportData[], filename: string, sheetName: string = "Sheet1") => {
  if (!data || data.length === 0) {
    showError("No data available to export.");
    return;
  }

  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
    showSuccess(`Exported "${filename}.xlsx" successfully!`);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    showError(`Failed to export "${filename}.xlsx".`);
  }
};