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
import { AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea

interface CsvDuplicateItem {
  sku: string;
  csvQuantity: number;
  itemName: string;
}

interface DuplicateItemsWarningDialogProps {
  isOpen: boolean;
  onClose: () => void; // For cancelling the whole operation
  duplicates: CsvDuplicateItem[];
  onSkipAll: () => void;
  onAddToExistingStock: () => void;
  onUpdateExisting: () => void; // NEW: Add onUpdateExisting prop
}

const MAX_ITEMS_PER_PAGE = 5; // Max items to show per page

const DuplicateItemsWarningDialog: React.FC<DuplicateItemsWarningDialogProps> = ({
  isOpen,
  onClose,
  duplicates,
  onSkipAll,
  onAddToExistingStock,
  onUpdateExisting, // NEW: Destructure onUpdateExisting
}) => {
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = Math.ceil(duplicates.length / MAX_ITEMS_PER_PAGE);
  const paginatedDuplicates = duplicates.slice(
    currentPage * MAX_ITEMS_PER_PAGE,
    (currentPage + 1) * MAX_ITEMS_PER_PAGE
  );

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  // Reset page when dialog opens or duplicates change
  React.useEffect(() => {
    if (isOpen) {
      setCurrentPage(0);
    }
  }, [isOpen, duplicates]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col"> {/* Increased max-w to 700px */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-yellow-500" /> Potential Duplicate Items Detected
          </DialogTitle>
          <DialogDescription>
            The following items from your CSV already exist in your inventory. Please choose how to proceed:
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow flex flex-col gap-4 py-4 overflow-hidden">
          <p className="text-sm text-muted-foreground">
            For these SKUs, you can either skip them, add the quantities from the CSV to their current stock levels, or update their existing details with the data from the CSV.
          </p>
          
          {duplicates.length > 0 ? (
            <>
              <ScrollArea className="flex-grow max-h-[200px] border border-border rounded-md p-3">
                <ul className="list-disc list-inside text-left text-sm">
                  {paginatedDuplicates.map((item, index) => (
                    <li key={item.sku} className="font-semibold">
                      {item.itemName} (SKU: {item.sku}) - CSV Quantity: {item.csvQuantity}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
              {totalPages > 1 && (
                <div className="flex justify-between items-center text-sm text-muted-foreground mt-2">
                  <Button variant="ghost" size="sm" onClick={handlePreviousPage} disabled={currentPage === 0}>
                    Previous
                  </Button>
                  <span>Page {currentPage + 1} of {totalPages}</span>
                  <Button variant="ghost" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages - 1}>
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-muted-foreground py-4">No duplicate items to display.</p>
          )}
        </div>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2 space-y-2 sm:space-y-0">
          <Button variant="outline" onClick={onClose}>
            Cancel Import
          </Button>
          <Button variant="secondary" onClick={onSkipAll}>
            Skip All Duplicates
          </Button>
          <Button variant="secondary" onClick={onAddToExistingStock}> {/* Changed to secondary */}
            Add Quantities to Existing Stock
          </Button>
          <Button onClick={onUpdateExisting}> {/* NEW: Add Update Existing button */}
            Update Existing Items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicateItemsWarningDialog;