"use client";

import React, { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { showSuccess, showError } from "@/utils/toast";
import { useInventory } from "@/context/InventoryContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useCategories } from "@/context/CategoryContext";
import { useVendors } from "@/context/VendorContext";
import { generateQrCodeSvg } from "@/utils/qrCodeGenerator";
import { supabase } from "@/lib/supabaseClient";
import { useProfile } from "@/context/ProfileContext";
import { Link } from "react-router-dom";
import { parseLocationString, buildLocationString, getUniqueLocationParts, LocationParts } from "@/utils/locationParser"; // NEW
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"; // NEW: Import ToggleGroup

interface AddInventoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddInventoryDialog: React.FC<AddInventoryDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { addInventoryItem } = useInventory();
  const { locations } = useOnboarding(); // Now contains Location[]
  const { categories } = useCategories();
  const { vendors } = useVendors();
  const { profile } = useProfile();

  const [viewMode, setViewMode] = useState<"simple" | "detailed">("simple"); // NEW: State for view mode

  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [simpleQuantity, setSimpleQuantity] = useState(""); // NEW: For simple mode total quantity
  const [pickingBinQuantity, setPickingBinQuantity] = useState("");
  const [overstockQuantity, setOverstockQuantity] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [pickingReorderLevel, setPickingReorderLevel] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  
  // NEW: States for main location parts
  const [mainLocationParts, setMainLocationParts] = useState<LocationParts>({ area: '', row: '', bay: '', level: '', pos: '' });
  // NEW: States for picking bin location parts
  const [pickingBinLocationParts, setPickingBinLocationParts] = useState<LocationParts>({ area: '', row: '', bay: '', level: '', pos: '' });

  const [selectedVendorId, setSelectedVendorId] = useState("none");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [qrCodeSvgPreview, setQrCodeSvgPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlPreview, setImageUrlPreview] = useState<string | null>(null);
  const [autoReorderEnabled, setAutoReorderEnabled] = useState(false);
  const [autoReorderQuantity, setAutoReorderQuantity] = useState("");

  // Derived unique options for dropdowns from all existing locations
  const uniqueAreas = getUniqueLocationParts(locations.map(loc => loc.fullLocationString), 'area');
  const uniqueRows = getUniqueLocationParts(locations.map(loc => loc.fullLocationString), 'row');
  const uniqueBays = getUniqueLocationParts(locations.map(loc => loc.fullLocationString), 'bay');
  const uniqueLevels = getUniqueLocationParts(locations.map(loc => loc.fullLocationString), 'level');
  const uniquePositions = getUniqueLocationParts(locations.map(loc => loc.fullLocationString), 'pos');

  // Get a default location string for simple mode
  const defaultLocationString = locations.length > 0 ? locations[0].fullLocationString : "Main Warehouse-01-01-1-A";
  const defaultPickingBinLocationString = locations.length > 0 ? locations[0].fullLocationString : "Picking Bin-01-01-1-A";


  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setViewMode("simple"); // Reset to simple mode
      setItemName("");
      setDescription("");
      setSku("");
      setCategory("");
      setSimpleQuantity(""); // Reset simple quantity
      setPickingBinQuantity("");
      setOverstockQuantity("");
      setReorderLevel("");
      setPickingReorderLevel("");
      setUnitCost("");
      setRetailPrice("");
      setMainLocationParts(parseLocationString(defaultLocationString)); // NEW: Set default parsed location
      setPickingBinLocationParts(parseLocationString(defaultPickingBinLocationString)); // NEW: Set default parsed picking bin location
      setSelectedVendorId("none");
      setBarcodeValue("");
      setQrCodeSvgPreview(null);
      setImageFile(null);
      setImageUrlPreview(null);
      setAutoReorderEnabled(false);
      setAutoReorderQuantity("");
    }
  }, [isOpen, defaultLocationString, defaultPickingBinLocationString]);

  // Autopopulate barcodeValue with SKU and generate QR preview
  useEffect(() => {
    const updateQrCode = async () => {
      const value = sku.trim();
      setBarcodeValue(value);
      if (value) {
        try {
          const svg = await generateQrCodeSvg(value, 60); // Adjusted size to 60
          setQrCodeSvgPreview(svg);
        } catch (error) {
          console.error("Error generating QR code preview:", error);
          setQrCodeSvgPreview(null);
        }
      } else {
        setQrCodeSvgPreview(null);
      }
    };
    updateQrCode();
  }, [sku]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (file.type.startsWith("image/")) {
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageUrlPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        showError("Please select an image file (PNG, JPG, GIF, SVG).");
        setImageFile(null);
        setImageUrlPreview(null);
      }
    } else {
      setImageFile(null);
      setImageUrlPreview(null);
    }
  };

  const handleSubmit = async () => {
    let finalPickingBinQuantity: number;
    let finalOverstockQuantity: number;
    let finalReorderLevel: number;
    let finalPickingReorderLevel: number;
    let finalLocation: string;
    let finalPickingBinLocation: string;
    let finalCommittedStock = 0;
    let finalIncomingStock = 0;

    if (viewMode === "simple") {
      const parsedSimpleQuantity = parseInt(simpleQuantity || '0');
      finalPickingBinQuantity = parsedSimpleQuantity;
      finalOverstockQuantity = 0; // No overstock in simple mode
      finalReorderLevel = parseInt(reorderLevel || '0');
      finalPickingReorderLevel = parseInt(reorderLevel || '0'); // Use overall reorder level for picking bin too
      finalLocation = defaultLocationString; // Use default location
      finalPickingBinLocation = defaultPickingBinLocationString; // Use default picking bin location
    } else { // detailed mode
      finalPickingBinQuantity = parseInt(pickingBinQuantity || '0');
      finalOverstockQuantity = parseInt(overstockQuantity || '0');
      finalReorderLevel = parseInt(reorderLevel || '0');
      finalPickingReorderLevel = parseInt(pickingReorderLevel || '0');
      finalLocation = buildLocationString(mainLocationParts);
      finalPickingBinLocation = buildLocationString(pickingBinLocationParts);
      // These are only in detailed mode, so use their states
      finalCommittedStock = 0; // Not exposed in form, always 0 on add
      finalIncomingStock = 0; // Not exposed in form, always 0 on add
    }

    // Basic validation for common required fields
    if (
      !itemName.trim() ||
      !sku.trim() ||
      !category.trim() ||
      !unitCost ||
      !retailPrice ||
      (viewMode === "simple" && (!simpleQuantity || isNaN(parseInt(simpleQuantity)) || parseInt(simpleQuantity) < 0)) ||
      (viewMode === "detailed" && (isNaN(finalPickingBinQuantity) || finalPickingBinQuantity < 0 || isNaN(finalOverstockQuantity) || finalOverstockQuantity < 0)) ||
      isNaN(finalReorderLevel) || finalReorderLevel < 0 ||
      isNaN(finalPickingReorderLevel) || finalPickingReorderLevel < 0 ||
      isNaN(parseFloat(unitCost)) || parseFloat(unitCost) < 0 ||
      isNaN(parseFloat(retailPrice)) || parseFloat(retailPrice) < 0 ||
      (autoReorderEnabled && (isNaN(parseInt(autoReorderQuantity || '0')) || parseInt(autoReorderQuantity || '0') <= 0))
    ) {
      showError("Please fill in all required fields with valid numbers.");
      return;
    }

    // Detailed mode specific location validation
    if (viewMode === "detailed" && (!finalLocation || !finalPickingBinLocation)) {
      showError("Please select all parts for both Main Storage Location and Picking Bin Location.");
      return;
    }

    if (!profile?.organizationId) {
      showError("Organization ID not found. Please ensure your company profile is set up.");
      return;
    }

    const { data: existingItem, error: fetchError } = await supabase
      .from('inventory_items')
      .select('sku')
      .eq('sku', sku.trim())
      .eq('organization_id', profile.organizationId)
      .single();

    if (existingItem) {
      showError(`An item with SKU '${sku.trim()}' already exists in your organization. Please use a unique SKU.`);
      return;
    }
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error("Error checking for duplicate SKU:", fetchError);
      showError("Failed to check for duplicate SKU. Please try again.");
      return;
    }

    const newItem = {
      name: itemName.trim(),
      description: description.trim(),
      sku: sku.trim(),
      category: category.trim(),
      pickingBinQuantity: finalPickingBinQuantity,
      overstockQuantity: finalOverstockQuantity,
      reorderLevel: finalReorderLevel,
      pickingReorderLevel: finalPickingReorderLevel,
      committedStock: finalCommittedStock,
      incomingStock: finalIncomingStock,
      unitCost: parseFloat(unitCost),
      retailPrice: parseFloat(retailPrice),
      location: finalLocation,
      pickingBinLocation: finalPickingBinLocation,
      imageUrl: imageUrlPreview || undefined,
      vendorId: selectedVendorId === "none" ? undefined : selectedVendorId,
      barcodeUrl: barcodeValue || undefined,
      autoReorderEnabled: autoReorderEnabled,
      autoReorderQuantity: parseInt(autoReorderQuantity || '0'),
    };

    try {
      await addInventoryItem(newItem);
      showSuccess(`Added ${finalPickingBinQuantity + finalOverstockQuantity} of ${itemName} to inventory!`);
      onClose();
    } catch (error: any) {
      console.error("Failed to add inventory item:", error);
      showError("Failed to add item: " + (error.message || "Unknown error. Please check console for details."));
    }
  };

  // NEW: Check if any location parts are missing (only relevant for detailed mode)
  const areMainLocationPartsMissing = viewMode === "detailed" && (!mainLocationParts.area || !mainLocationParts.row || !mainLocationParts.bay || !mainLocationParts.pos);
  const arePickingBinLocationPartsMissing = viewMode === "detailed" && (!pickingBinLocationParts.area || !pickingBinLocationParts.row || !pickingBinLocationParts.bay || !pickingBinLocationParts.pos);

  const isFormInvalid =
    !itemName.trim() ||
    !sku.trim() ||
    !category.trim() ||
    (viewMode === "simple" && (!simpleQuantity || isNaN(parseInt(simpleQuantity)) || parseInt(simpleQuantity) < 0)) ||
    (viewMode === "detailed" && (!pickingBinQuantity || isNaN(parseInt(pickingBinQuantity)) || parseInt(pickingBinQuantity) < 0)) ||
    (viewMode === "detailed" && (!overstockQuantity || isNaN(parseInt(overstockQuantity)) || parseInt(overstockQuantity) < 0)) ||
    !reorderLevel || isNaN(parseInt(reorderLevel)) || parseInt(reorderLevel) < 0 ||
    (viewMode === "detailed" && (!pickingReorderLevel || isNaN(parseInt(pickingReorderLevel)) || parseInt(pickingReorderLevel) < 0)) ||
    !unitCost || isNaN(parseFloat(unitCost)) || parseFloat(unitCost) < 0 ||
    !retailPrice || isNaN(parseFloat(retailPrice)) || parseFloat(retailPrice) < 0 ||
    areMainLocationPartsMissing ||
    arePickingBinLocationPartsMissing ||
    (viewMode === "detailed" && locations.length === 0) || // Only require locations if in detailed mode
    categories.length === 0 ||
    (autoReorderEnabled && (parseInt(autoReorderQuantity || '0') <= 0 || isNaN(parseInt(autoReorderQuantity || '0'))));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Inventory Item</DialogTitle>
          <DialogDescription>
            Enter details for the new item to add to your inventory. Fields marked with (*) are required.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center mb-4">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value: "simple" | "detailed") => value && setViewMode(value)}
            aria-label="Inventory item view mode"
            className="bg-muted rounded-md p-1"
          >
            <ToggleGroupItem value="simple" aria-label="Simple view" className="px-4 py-2 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm">
              Simple View
            </ToggleGroupItem>
            <ToggleGroupItem value="detailed" aria-label="Detailed view" className="px-4 py-2 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm">
              Detailed View
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="itemName">Item Name <span className="text-red-500">*</span></Label>
            <Input
              id="itemName"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g., Laptop Pro X"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">SKU <span className="text-red-500">*</span></Label>
            <Input
              id="sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g., LPX-512-16"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed product description..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
            <Select value={category} onValueChange={setCategory} disabled={categories.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-categories" disabled>
                    No categories set up. Manage categories.
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          {viewMode === "simple" ? (
            <div className="space-y-2">
              <Label htmlFor="simpleQuantity">Quantity <span className="text-red-500">*</span></Label>
              <Input
                id="simpleQuantity"
                type="number"
                value={simpleQuantity}
                onChange={(e) => setSimpleQuantity(e.target.value)}
                placeholder="e.g., 150"
                min="0"
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="pickingBinQuantity">Picking Bin Quantity <span className="text-red-500">*</span></Label>
                <Input
                  id="pickingBinQuantity"
                  type="number"
                  value={pickingBinQuantity}
                  onChange={(e) => setPickingBinQuantity(e.target.value)}
                  placeholder="e.g., 50"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overstockQuantity">Overstock Quantity <span className="text-red-500">*</span></Label>
                <Input
                  id="overstockQuantity"
                  type="number"
                  value={overstockQuantity}
                  onChange={(e) => setOverstockQuantity(e.target.value)}
                  placeholder="e.g., 100"
                  min="0"
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="reorderLevel">Overall Reorder Level <span className="text-red-500">*</span></Label>
            <Input
              id="reorderLevel"
              type="number"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              placeholder="e.g., 20"
              min="0"
            />
          </div>
          {viewMode === "detailed" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="pickingReorderLevel">Picking Bin Reorder Level <span className="text-red-500">*</span></Label>
                <Input
                  id="pickingReorderLevel"
                  type="number"
                  value={pickingReorderLevel}
                  onChange={(e) => setPickingReorderLevel(e.target.value)}
                  placeholder="e.g., 10"
                  min="0"
                />
              </div>
              {/* NEW: Main Storage Location Dropdowns */}
              <div className="space-y-2">
                <Label>Main Storage Location <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={mainLocationParts.area} onValueChange={(val) => setMainLocationParts(prev => ({ ...prev, area: val }))} disabled={locations.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Area" /></SelectTrigger>
                    <SelectContent>
                      {uniqueAreas.map(val => <SelectItem key={val} value={val}>{val}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={mainLocationParts.row} onValueChange={(val) => setMainLocationParts(prev => ({ ...prev, row: val }))} disabled={locations.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Row" /></SelectTrigger>
                    <SelectContent>
                      {uniqueRows.map(val => <SelectItem key={val} value={val}>{val}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={mainLocationParts.bay} onValueChange={(val) => setMainLocationParts(prev => ({ ...prev, bay: val }))} disabled={locations.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Bay" /></SelectTrigger>
                    <SelectContent>
                      {uniqueBays.map(val => <SelectItem key={val} value={val}>{val}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={mainLocationParts.level} onValueChange={(val) => setMainLocationParts(prev => ({ ...prev, level: val }))} disabled={locations.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
                    <SelectContent>
                      {uniqueLevels.map(val => <SelectItem key={val} value={val}>{val}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={mainLocationParts.pos} onValueChange={(val) => setMainLocationParts(prev => ({ ...prev, pos: val }))} disabled={locations.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Pos" /></SelectTrigger>
                    <SelectContent>
                      {uniquePositions.map(val => <SelectItem key={val} value={val}>{val}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {locations.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    You need to set up inventory locations first.
                    <Button variant="link" size="sm" asChild className="p-0 h-auto ml-1">
                      <Link to="/locations">Manage Locations</Link>
                    </Button>
                  </p>
                )}
              </div>
              {/* NEW: Picking Bin Location Dropdowns */}
              <div className="space-y-2">
                <Label>Picking Bin Location <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={pickingBinLocationParts.area} onValueChange={(val) => setPickingBinLocationParts(prev => ({ ...prev, area: val }))} disabled={locations.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Area" /></SelectTrigger>
                    <SelectContent>
                      {uniqueAreas.map(val => <SelectItem key={val} value={val}>{val}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={pickingBinLocationParts.row} onValueChange={(val) => setPickingBinLocationParts(prev => ({ ...prev, row: val }))} disabled={locations.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Row" /></SelectTrigger>
                    <SelectContent>
                      {uniqueRows.map(val => <SelectItem key={val} value={val}>{val}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={pickingBinLocationParts.bay} onValueChange={(val) => setPickingBinLocationParts(prev => ({ ...prev, bay: val }))} disabled={locations.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Bay" /></SelectTrigger>
                    <SelectContent>
                      {uniqueBays.map(val => <SelectItem key={val} value={val}>{val}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={pickingBinLocationParts.level} onValueChange={(val) => setPickingBinLocationParts(prev => ({ ...prev, level: val }))} disabled={locations.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
                    <SelectContent>
                      {uniqueLevels.map(val => <SelectItem key={val} value={val}>{val}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={pickingBinLocationParts.pos} onValueChange={(val) => setPickingBinLocationParts(prev => ({ ...prev, pos: val }))} disabled={locations.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Pos" /></SelectTrigger>
                    <SelectContent>
                      {uniquePositions.map(val => <SelectItem key={val} value={val}>{val}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="committedStock">Committed Stock</Label>
                <Input
                  id="committedStock"
                  type="number"
                  value={0} // Always 0 on add
                  disabled
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="incomingStock">Incoming Stock</Label>
                <Input
                  id="incomingStock"
                  type="number"
                  value={0} // Always 0 on add
                  disabled
                  placeholder="0"
                  min="0"
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="unitCost">Unit Cost <span className="text-red-500">*</span></Label>
            <Input
              id="unitCost"
              type="number"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="e.g., 900.00"
              step="0.01"
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="retailPrice">Retail Price <span className="text-red-500">*</span></Label>
            <Input
              id="retailPrice"
              type="number"
              value={retailPrice}
              onChange={(e) => setRetailPrice(e.target.value)}
              placeholder="e.g., 1200.00"
              step="0.01"
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor">Primary Vendor</Label>
            <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
              <SelectTrigger id="vendor">
                <SelectValue placeholder="Select a vendor (Optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Vendor</SelectItem>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="barcodeValue">QR Code Value (from SKU)</Label>
            <Input
              id="barcodeValue"
              value={barcodeValue}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Enter SKU or custom value"
              disabled
            />
            {qrCodeSvgPreview && (
              <div className="mt-2 p-4 border border-border rounded-md bg-white flex justify-center">
                <div dangerouslySetInnerHTML={{ __html: qrCodeSvgPreview }} />
              </div>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="itemImage">Product Image</Label>
            <Input
              id="itemImage"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            {imageUrlPreview && (
              <div className="mt-2">
                <img src={imageUrlPreview} alt="Product Preview" className="max-w-[100px] max-h-[100px] object-contain border border-border p-1 rounded-md" />
              </div>
            )}
          </div>
          <div className="space-y-2 md:col-span-2 border-t border-border pt-4 mt-4">
            <h3 className="text-lg font-semibold">Auto-Reorder Settings</h3>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="autoReorderEnabled">Enable Auto-Reorder</Label>
              <Switch
                id="autoReorderEnabled"
                checked={autoReorderEnabled}
                onCheckedChange={setAutoReorderEnabled}
              />
            </div>
            {autoReorderEnabled && (
              <div className="space-y-2 mt-2">
                <Label htmlFor="autoReorderQuantity">Quantity to Auto-Reorder</Label>
                <Input
                  id="autoReorderQuantity"
                  type="number"
                  value={autoReorderQuantity}
                  onChange={(e) => setAutoReorderQuantity(e.target.value)}
                  placeholder="e.g., 50"
                  min="1"
                />
                <p className="text-xs text-muted-foreground">
                  This quantity will be ordered when stock drops to or below the overall reorder level.
                </p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isFormInvalid}>
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddInventoryDialog;