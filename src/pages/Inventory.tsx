import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PlusCircle, Search, Info, MoreHorizontal, Eye, Edit, Trash2, List, LayoutGrid, MapPin, PackagePlus, Upload, Repeat, Scan as ScanIcon, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useInventory, InventoryItem } from "@/context/InventoryContext";
import { useCategories } from "@/context/CategoryContext";
import { useVendors } from "@/context/VendorContext";
import { useOnboarding } from "@/context/OnboardingContext"; // Now contains Location[]
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { showError, showSuccess } from "@/utils/toast";

import InventoryCardGrid from "@/components/inventory/InventoryCardGrid";
import InventoryCard from "@/components/InventoryCard";
import ManageLocationsDialog from "@/components/ManageLocationsDialog";
import CategoryManagementDialog from "@/components/CategoryManagementDialog";
import ScanItemDialog from "@/components/ScanItemDialog";
import BulkUpdateDialog from "@/components/BulkUpdateDialog";
import ImportCsvDialog from "@/components/ImportCsvDialog";
import AutoReorderSettingsDialog from "@/components/AutoReorderSettingsDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import InventoryItemQuickViewDialog from "@/components/InventoryItemQuickViewDialog";
import AddInventoryDialog from "@/components/AddInventoryDialog";
import { useSidebar } from "@/context/SidebarContext";

export const createInventoryColumns = (handleQuickView: (item: InventoryItem) => void, structuredLocations: any[]): ColumnDef<InventoryItem>[] => [ // NEW: Pass structuredLocations
  {
    accessorKey: "name",
    header: "Item Name",
    cell: ({ row }) => (
      <Button variant="link" className="p-0 h-auto text-left font-medium hover:underline" onClick={() => handleQuickView(row.original)}>
        {row.getValue("name")}
      </Button>
    ),
  },
  {
    accessorKey: "sku",
    header: "SKU",
  },
  {
    accessorKey: "category",
    header: "Category",
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => (
      <span className={row.original.quantity <= row.original.reorderLevel ? "text-red-500 font-semibold" : ""}>
        {row.getValue("quantity")}
      </span>
    ),
  },
  {
    accessorKey: "reorderLevel",
    header: "Reorder Level",
  },
  {
    accessorKey: "location",
    header: "Location",
    cell: ({ row }) => { // NEW: Resolve display name for location
      const fullLocationString = row.original.location;
      const foundLoc = structuredLocations.find(loc => loc.fullLocationString === fullLocationString);
      return foundLoc?.displayName || fullLocationString;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      let variant: "success" | "warning" | "destructive" | "info" | "muted" = "info";
      switch (row.original.status) {
        case "In Stock":
          variant = "success";
          break;
        case "Low Stock":
          variant = "warning";
          break;
        case "Out of Stock":
          variant = "destructive";
          break;
      }
      return <Badge variant={variant}>{row.original.status}</Badge>;
    },
  },
  {
    accessorKey: "unitCost",
    header: "Unit Cost",
    cell: ({ row }) => `$${parseFloat(row.original.unitCost.toString() || '0').toFixed(2)}`,
  },
  {
    accessorKey: "retailPrice",
    header: "Retail Price",
    cell: ({ row }) => `$${parseFloat(row.original.retailPrice.toString() || '0').toFixed(2)}`,
  },
];

const Inventory: React.FC = () => {
  const { inventoryItems, deleteInventoryItem, refreshInventory, isLoadingInventory } = useInventory();
  const { categories } = useCategories();
  const { vendors } = useVendors();
  const { locations: structuredLocations } = useOnboarding(); // Now contains Location[]
  const navigate = useNavigate();
  const { isCollapsed } = useSidebar();

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddInventoryDialogOpen, setIsAddInventoryDialogOpen] = useState(false);
  const [isManageCategoriesDialogOpen, setIsManageCategoriesDialogOpen] = useState(false);
  const [isManageLocationsDialogOpen, setIsManageLocationsDialogOpen] = useState(false);
  const [isScanItemDialogOpen, setIsScanItemDialogOpen] = useState(false);
  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false);
  const [isImportCsvDialogOpen, setIsImportCsvDialogOpen] = useState(false);
  const [isAutoReorderSettingsDialogOpen, setIsAutoReorderSettingsDialogOpen] = useState(false);

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  const [isQuickViewDialogOpen, setIsQuickViewDialogOpen] = useState(false);
  const [selectedItemForQuickView, setSelectedItemForQuickView] = useState<InventoryItem | null>(null);

  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [locationFilter, setLocationFilter] = useState("all"); // This will be fullLocationString or "all"
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    refreshInventory();
  }, [refreshInventory]);

  const vendorNameMap = useMemo(() => {
    return new Map(vendors.map(vendor => [vendor.id, vendor.name]));
  }, [vendors]);

  const filteredItems = useMemo(() => {
    return inventoryItems
      .filter(item => {
        const matchesSearch =
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.vendorId ? (vendorNameMap.get(item.vendorId) || "").toLowerCase().includes(searchTerm.toLowerCase()) : false);

        const matchesLocation = locationFilter === "all" || item.location === locationFilter || item.pickingBinLocation === locationFilter;
        const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
        const matchesStatus = statusFilter === "all" || item.status === statusFilter;

        return matchesSearch && matchesLocation && matchesCategory && matchesStatus;
      })
      .map(item => ({
        ...item,
        vendorName: item.vendorId ? vendorNameMap.get(item.vendorId) || '-' : '-',
      }));
  }, [inventoryItems, searchTerm, vendorNameMap, locationFilter, categoryFilter, statusFilter]);

  const handleDeleteItemClick = useCallback((itemId: string, itemName: string) => {
    setItemToDelete({ id: itemId, name: itemName });
    setIsConfirmDeleteDialogOpen(true);
  }, []);

  const confirmDeleteItem = async () => {
    if (itemToDelete) {
      await deleteInventoryItem(itemToDelete.id);
    }
    setIsConfirmDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleViewDetails = useCallback((item: InventoryItem) => {
    navigate(`/inventory/${item.id}`);
  }, [navigate]);

  const handleEditItem = useCallback((item: InventoryItem) => {
    navigate(`/inventory/${item.id}`);
  }, [navigate]);

  const handleQuickView = useCallback((item: InventoryItem) => {
    setSelectedItemForQuickView(item);
    setIsQuickViewDialogOpen(true);
  }, []);

  const handleScanItem = () => {
    setIsScanItemDialogOpen(true);
  };

  const handleCreateOrder = useCallback((item: InventoryItem) => {
    showSuccess(`Create order for ${item.name} (placeholder)`);
  }, []);

  const columnsForDataTable = useMemo(() => createInventoryColumns(handleQuickView, structuredLocations), [handleQuickView, structuredLocations]); // NEW: Pass structuredLocations

  return (
    <div className="flex flex-col space-y-6" data-testid="inventory-page-root">
      <h1 className="text-3xl font-bold">Inventory Management</h1>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by name, SKU, or description..."
          className="flex-grow max-w-xs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {structuredLocations.map(loc => (
              <SelectItem key={loc.id} value={loc.fullLocationString}>{loc.displayName || loc.fullLocationString}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="In Stock">In Stock</SelectItem>
            <SelectItem value="Low Stock">Low Stock</SelectItem>
            <SelectItem value="Out of Stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center ml-auto space-x-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === "table" ? "secondary" : "outline"}
                size="icon"
                onClick={() => setViewMode("table")}
              >
                <List className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Table View</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === "card" ? "secondary" : "outline"}
                size="icon"
                onClick={() => setViewMode("card")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Card View</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="rounded-md border">
        <CardHeader className="pb-4 flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-xl font-semibold">Current Stock</CardTitle>
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <Button onClick={() => setIsAddInventoryDialogOpen(true)} size="sm">
              <PlusCircle className="h-4 w-4 mr-2" /> Add New Item
            </Button>
            <Button variant="outline" onClick={() => setIsManageCategoriesDialogOpen(true)} size="sm">
              Manage Categories
            </Button>
            <Button variant="outline" onClick={() => navigate("/locations")} size="sm"> {/* Changed to navigate to /locations */}
              <MapPin className="h-4 w-4 mr-2" /> Manage Locations
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <PackagePlus className="h-4 w-4 mr-2" /> Tools <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleScanItem}>
                  <ScanIcon className="h-4 w-4 mr-2" /> Scan Item
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsImportCsvDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" /> Import CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsBulkUpdateDialogOpen(true)}>
                  <PackagePlus className="h-4 w-4 mr-2" /> Bulk Update
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsAutoReorderSettingsDialogOpen(true)}>
                  <Repeat className="h-4 w-4 mr-2" /> Auto-Reorder Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingInventory ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading inventory...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No inventory items found.</p>
          ) : (
            <>
              {viewMode === "table" && (
                <DataTable columns={columnsForDataTable} data={filteredItems} />
              )}
              {viewMode === "card" && (
                <InventoryCardGrid
                  items={filteredItems}
                  onAdjustStock={handleQuickView}
                  onCreateOrder={handleCreateOrder}
                  onViewDetails={handleQuickView}
                  onDeleteItem={handleDeleteItemClick}
                  isSidebarCollapsed={isCollapsed}
                />
              )}
            </>
          )}
        </CardContent>
      </div>

      <AddInventoryDialog
        isOpen={isAddInventoryDialogOpen}
        onClose={() => setIsAddInventoryDialogOpen(false)}
      />
      <ManageLocationsDialog
        isOpen={isManageLocationsDialogOpen}
        onClose={() => setIsManageLocationsDialogOpen(false)}
      />
      <CategoryManagementDialog
        isOpen={isManageCategoriesDialogOpen}
        onClose={() => setIsManageCategoriesDialogOpen(false)}
      />
      <ScanItemDialog
        isOpen={isScanItemDialogOpen}
        onClose={() => setIsScanItemDialogOpen(false)}
      />
      <BulkUpdateDialog
        isOpen={isBulkUpdateDialogOpen}
        onClose={() => setIsBulkUpdateDialogOpen(false)}
      />
      <ImportCsvDialog
        isOpen={isImportCsvDialogOpen}
        onClose={() => setIsImportCsvDialogOpen(false)}
      />
      <AutoReorderSettingsDialog
        isOpen={isAutoReorderSettingsDialogOpen}
        onClose={() => setIsAutoReorderSettingsDialogOpen(false)}
      />
      {itemToDelete && (
        <ConfirmDialog
          isOpen={isConfirmDeleteDialogOpen}
          onClose={() => setIsConfirmDeleteDialogOpen(false)}
          onConfirm={confirmDeleteItem}
          title="Confirm Item Deletion"
          description={`Are you sure you want to delete "${itemToDelete.name}" (SKU: ${itemToDelete.id})? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
      <InventoryItemQuickViewDialog
        isOpen={isQuickViewDialogOpen}
        onClose={() => setIsQuickViewDialogOpen(false)}
        item={selectedItemForQuickView}
      />
    </div>
  );
};

export default Inventory;