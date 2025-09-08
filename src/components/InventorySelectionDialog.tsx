import React, { useState, useMemo, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Package } from "lucide-react";
import { useInventory, InventoryItem } from "@/context/InventoryContext";
import { showSuccess } from "@/utils/toast";
import { useOnboarding } from "@/context/OnboardingContext"; // NEW: Import useOnboarding

interface InventorySelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (selectedItems: InventoryItem[]) => void;
  itemType: "purchase" | "sales"; // To determine which price to use
}

const InventorySelectionDialog: React.FC<InventorySelectionDialogProps> = ({
  isOpen,
  onClose,
  onAddItems,
  itemType,
}) => {
  const { inventoryItems } = useInventory();
  const { locations: structuredLocations } = useOnboarding(); // NEW: Get structured locations
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setSelectedItemIds(new Set());
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) {
      return inventoryItems;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return inventoryItems.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        item.sku.toLowerCase().includes(lowerCaseSearchTerm) ||
        item.description.toLowerCase().includes(lowerCaseSearchTerm) ||
        item.category.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [inventoryItems, searchTerm]);

  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    setSelectedItemIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  const handleAddSelected = () => {
    const itemsToAdd = filteredItems.filter((item) =>
      selectedItemIds.has(item.id)
    );
    if (itemsToAdd.length > 0) {
      onAddItems(itemsToAdd);
      showSuccess(`Added ${itemsToAdd.length} item(s) to the order.`);
      onClose();
    } else {
      showSuccess("No items selected.");
    }
  };

  const getLocationDisplayName = (fullLocationString: string) => {
    const foundLoc = structuredLocations.find(loc => loc.fullLocationString === fullLocationString);
    return foundLoc?.displayName || fullLocationString;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" /> Select Inventory Items
          </DialogTitle>
          <DialogDescription>
            Search and select items from your inventory to add to this {itemType} order.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow flex flex-col gap-4 py-4 overflow-hidden">
          <div className="space-y-2">
            <Label htmlFor="inventorySearch">Search Items</Label>
            <Input
              id="inventorySearch"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, SKU, category..."
            />
          </div>

          <ScrollArea className="flex-grow border border-border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedItemIds.size === filteredItems.length && filteredItems.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedItemIds(new Set(filteredItems.map(item => item.id)));
                        } else {
                          setSelectedItemIds(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead> {/* NEW: Added Location column */}
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="text-right">
                    {itemType === "purchase" ? "Unit Cost" : "Retail Price"}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8"> {/* Adjusted colspan */}
                      No inventory items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItemIds.has(item.id)}
                          onCheckedChange={(checked: boolean) =>
                            handleCheckboxChange(item.id, checked)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{getLocationDisplayName(item.location)}</TableCell> {/* NEW: Display location */}
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        ${itemType === "purchase" ? item.unitCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : item.retailPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAddSelected} disabled={selectedItemIds.size === 0}>
            Add Selected Items ({selectedItemIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InventorySelectionDialog;