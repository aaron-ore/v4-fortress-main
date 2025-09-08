"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Package, Search } from "lucide-react";
import { useInventory, InventoryItem } from "@/context/InventoryContext";
import { Input } from "@/components/ui/input";
import { useOnboarding } from "@/context/OnboardingContext"; // NEW: Import useOnboarding

interface LocationInventoryViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  locationName: string; // This is the fullLocationString
}

const LocationInventoryViewDialog: React.FC<LocationInventoryViewDialogProps> = ({
  isOpen,
  onClose,
  locationName,
}) => {
  const { inventoryItems } = useInventory();
  const { locations: structuredLocations } = useOnboarding(); // NEW: Get structured locations
  const [searchTerm, setSearchTerm] = useState("");

  const locationDisplayName = useMemo(() => {
    const foundLoc = structuredLocations.find(loc => loc.fullLocationString === locationName);
    return foundLoc?.displayName || locationName;
  }, [structuredLocations, locationName]);

  const itemsInLocation = useMemo(() => {
    return inventoryItems.filter(item =>
      item.location === locationName || item.pickingBinLocation === locationName
    );
  }, [inventoryItems, locationName]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) {
      return itemsInLocation;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return itemsInLocation.filter(item =>
      item.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      item.sku.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [itemsInLocation, searchTerm]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm(""); // Reset search when dialog opens
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" /> Inventory in "{locationDisplayName}"
          </DialogTitle>
          <DialogDescription>
            Viewing all inventory items currently stored in {locationDisplayName}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow flex flex-col gap-4 py-4 px-6 overflow-hidden">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search items by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow"
            />
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>

          {filteredItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No inventory items found in "{locationDisplayName}" matching your search.
            </p>
          ) : (
            <ScrollArea className="flex-grow border border-border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Picking Bin Qty</TableHead>
                    <TableHead className="text-right">Overstock Qty</TableHead>
                    <TableHead className="text-right">Total Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-right">{item.pickingBinQuantity}</TableCell>
                      <TableCell className="text-right">{item.overstockQuantity}</TableCell>
                      <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LocationInventoryViewDialog;