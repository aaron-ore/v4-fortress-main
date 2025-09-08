import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showSuccess, showError } from "@/utils/toast";
import { Download, Upload } from "lucide-react";
import * as XLSX from 'xlsx';
import { useInventory } from "@/context/InventoryContext";

interface BulkUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// Define the fields that can be updated via bulk upload
const updatableFields = [
  "name",
  "description",
  "category",
  "quantity",
  "reorderLevel",
  "committedStock",
  "incomingStock",
  "unitCost",
  "retailPrice",
  "location",
  "imageUrl",
  "vendorId",
  "barcodeUrl",
];

const generateBulkUpdateCsvTemplate = (): string => {
  const headers = ["sku", ...updatableFields];
  const exampleRow = [
    "SKU-001", // Existing SKU to update
    "Updated Product Name",
    "New description for Product A",
    "Electronics",
    "120", // New quantity
    "25", // New reorder level
    "10",
    "5",
    "55.00",
    "80.00",
    "Warehouse B",
    "http://example.com/new_imageA.jpg",
    "vendor-uuid-456",
    "SKU-001-NEW", // New barcode value
  ];

  const csvContent = [
    headers.join(","),
    exampleRow.join(","),
  ].join("\n");

  return csvContent;
};

const BulkUpdateDialog: React.FC<BulkUpdateDialogProps> = ({ isOpen, onClose }) => {
  const { inventoryItems, updateInventoryItem, refreshInventory } = useInventory();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (file.name.endsWith(".csv")) {
        setSelectedFile(file);
      } else {
        showError("Please select a CSV file.");
        setSelectedFile(null);
      }
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showError("Please select a CSV file to upload.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const binaryString = e.target?.result;
        if (typeof binaryString !== 'string') {
          showError("Failed to read file content.");
          setIsUploading(false);
          return;
        }

        const workbook = XLSX.read(binaryString, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          showError("The CSV file is empty or contains no data rows.");
          setIsUploading(false);
          return;
        }

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (const row of jsonData) {
          const skuToUpdate = String(row.sku || '').trim();
          if (!skuToUpdate) {
            errors.push(`Row: Missing SKU. Cannot update item.`);
            errorCount++;
            continue;
          }

          const existingItem = inventoryItems.find(item => item.sku === skuToUpdate);
          if (!existingItem) {
            errors.push(`SKU '${skuToUpdate}': Item not found in inventory. Skipping update.`);
            errorCount++;
            continue;
          }

          const updatedFields: Partial<typeof existingItem> = {};
          let hasChanges = false;

          for (const field of updatableFields) {
            if (row[field] !== undefined && row[field] !== null) {
              let value = row[field];
              // Type conversion for numeric fields
              if (["quantity", "reorderLevel", "committedStock", "incomingStock"].includes(field)) {
                value = parseInt(String(value) || '0'); // Ensure string before parseInt, default to '0'
                if (isNaN(value) || value < 0) {
                  errors.push(`SKU '${skuToUpdate}': Invalid number for field '${field}'. Skipping update for this field.`);
                  continue;
                }
              } else if (["unitCost", "retailPrice"].includes(field)) {
                value = parseFloat(String(value) || '0'); // Ensure string before parseFloat, default to '0'
                if (isNaN(value) || value < 0) {
                  errors.push(`SKU '${skuToUpdate}': Invalid number for field '${field}'. Skipping update for this field.`);
                  continue;
                }
              } else {
                value = String(value).trim();
              }

              // Map to camelCase for context update function
              const camelCaseField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

              if ((existingItem as any)[camelCaseField] !== value) {
                (updatedFields as any)[camelCaseField] = value;
                hasChanges = true;
              }
            }
          }

          if (hasChanges) {
            try {
              await updateInventoryItem({ ...existingItem, ...updatedFields });
              successCount++;
            } catch (updateError: any) {
              errors.push(`Failed to update item '${existingItem.name}' (SKU: ${skuToUpdate}): ${updateError.message || 'Unknown error'}.`);
              errorCount++;
            }
          } else {
            errors.push(`SKU '${skuToUpdate}': No changes detected or invalid fields provided. Skipping.`);
            errorCount++;
          }
        }

        if (successCount > 0) {
          showSuccess(`Successfully updated ${successCount} item(s).`);
        }
        if (errorCount > 0) {
          showError(`Failed to update ${errorCount} item(s). See console for details.`);
          console.error("CSV Bulk Update Summary - Errors:", errors);
        }
        if (successCount === 0 && errorCount === 0) {
          showError("No valid updates found in the CSV.");
        }
        refreshInventory(); // Refresh inventory after bulk update
        onClose();
      } catch (parseError: any) {
        showError(`Error parsing CSV file: ${parseError.message}`);
        console.error("CSV Parse Error:", parseError);
      } finally {
        setIsUploading(false);
        setSelectedFile(null);
      }
    };

    reader.onerror = () => {
      showError("Failed to read file.");
      setIsUploading(false);
      setSelectedFile(null);
    };

    reader.readAsBinaryString(selectedFile);
  };

  const handleDownloadTemplate = () => {
    const csv = generateBulkUpdateCsvTemplate();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "inventory_bulk_update_template.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess("Bulk update CSV template downloaded!");
    } else {
      showError("Your browser does not support downloading files directly.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-6 w-6 text-primary" /> Bulk Inventory Update
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to update multiple inventory items at once. Items are matched by SKU.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="csvFile" className="text-right">
              CSV File
            </Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="col-span-3"
            />
          </div>
          {selectedFile && (
            <p className="col-span-4 text-center text-sm text-muted-foreground">
              Selected: {selectedFile.name}
            </p>
          )}
          <div className="col-span-4 text-center">
            <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download Bulk Update Template
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUpdateDialog;