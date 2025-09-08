import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Package, AlertCircle, TrendingUp, Scan, Receipt, MapPin, DollarSign, Boxes, FilterX } from "lucide-react";
import { useInventory } from "@/context/InventoryContext";
import { useOrders } from "@/context/OrdersContext";
import { format, isValid, startOfDay, endOfDay } from "date-fns";
import AddInventoryDialog from "@/components/AddInventoryDialog";
import ScanItemDialog from "@/components/ScanItemDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

const ClassicDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { inventoryItems } = useInventory();
  const { orders } = useOrders();

  const [isAddInventoryDialogOpen, setIsAddInventoryDialogOpen] = useState(false);
  const [isScanItemDialogOpen, setIsScanItemDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined); // Re-added dateRange state

  // Helper function to check if a date falls within the selected range
  const isDateInRange = (dateString: string) => {
    if (!dateRange?.from || !isValid(dateRange.from)) return true; // No valid 'from' date, so no filter applied

    const date = parseAndValidateDate(dateString);
    if (!date) return false; // Invalid date string, cannot be in range

    const from = startOfDay(dateRange.from);
    const to = dateRange.to && isValid(dateRange.to) ? endOfDay(dateRange.to) : endOfDay(dateRange.from); // Ensure 'to' is valid or default to 'from'

    return date >= from && date <= to;
  };

  // Key Metrics
  const totalStockValue = useMemo(() => {
    return inventoryItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  }, [inventoryItems]);

  const totalUnitsOnHand = useMemo(() => {
    return inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [inventoryItems]);

  const lowStockItems = useMemo(() => {
    return inventoryItems.filter(item => item.quantity <= item.reorderLevel);
  }, [inventoryItems]);

  const outOfStockItems = useMemo(() => {
    return inventoryItems.filter(item => item.quantity === 0);
  }, [inventoryItems]);

  // Recent Orders (last 5, excluding archived)
  const recentOrders = useMemo(() => {
    return orders
      .filter(order => order.status !== "Archived" && isDateInRange(order.date))
      .sort((a, b) => {
        const dateA = parseAndValidateDate(a.date);
        const dateB = parseAndValidateDate(b.date);
        if (!dateA || !dateB) return 0; // Handle null dates
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [orders, isDateInRange, dateRange]); // Added dateRange to dependencies

  const handleCreatePO = () => navigate("/create-po");
  const handleCreateInvoice = () => navigate("/create-invoice");
  const handleClearDateFilter = () => { setDateRange(undefined); }; // Re-added handler

  return (
    <div className="space-y-6">
      {/* Header and Date Filter in the same row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Classic Dashboard</h1>
        <div className="flex items-center gap-2">
          <DateRangePicker dateRange={dateRange} onSelect={setDateRange} />
          {dateRange?.from && isValid(dateRange.from) && ( // Only show clear button if a valid 'from' date exists
            <Button variant="outline" onClick={handleClearDateFilter} size="icon">
              <FilterX className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <p className="text-muted-foreground">A streamlined overview of your inventory and orders.</p>

      {/* Section 1: Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalStockValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Value of all items in stock</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Units On Hand</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnitsOnHand.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total quantity of all items</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">Items below reorder level</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Out-of-Stock Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{outOfStockItems.length}</div>
            <p className="text-xs text-muted-foreground">Items with zero quantity</p>
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Quick Actions */}
      <Card className="bg-card border-border rounded-lg shadow-sm p-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button onClick={() => setIsAddInventoryDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" /> Add New Item
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Receipt className="h-4 w-4 mr-2" /> Create Order
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>New Order</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCreatePO}>Purchase Order</DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreateInvoice}>Sales Invoice</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setIsScanItemDialogOpen(true)}>
            <Scan className="h-4 w-4 mr-2" /> Scan Item
          </Button>
          <Button variant="outline" onClick={() => navigate("/inventory")}>
            <Package className="h-4 w-4 mr-2" /> Manage Inventory
          </Button>
          <Button variant="outline" onClick={() => navigate("/orders")}>
            <TrendingUp className="h-4 w-4 mr-2" /> View All Orders
          </Button>
        </CardContent>
      </Card>

      {/* Section 3: Overviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border rounded-lg shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead className="text-right">On Hand</TableHead>
                      <TableHead className="text-right">Reorder Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.slice(0, 5).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right text-destructive">{item.quantity}</TableCell>
                        <TableCell className="text-right">{item.reorderLevel}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No items currently at low stock levels.</p>
            )}
            {lowStockItems.length > 5 && (
              <div className="text-center mt-4">
                <Button variant="link" onClick={() => navigate("/inventory?statusFilter=Low Stock")}>
                  View All Low Stock Items
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-lg shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Customer/Supplier</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((order) => (
                      <TableRow key={order.id} onClick={() => navigate(`/orders/${order.id}`)} className="cursor-pointer hover:bg-muted/20">
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell>{order.type}</TableCell>
                        <TableCell className="truncate max-w-[150px]">{order.customerSupplier}</TableCell>
                        <TableCell className="text-right">
                          {parseAndValidateDate(order.date) ? format(parseAndValidateDate(order.date)!, "MMM dd, yyyy") : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No recent orders to display.</p>
            )}
            {recentOrders.length > 0 && (
              <div className="text-center mt-4">
                <Button variant="link" onClick={() => navigate("/orders")}>
                  View All Orders
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddInventoryDialog
        isOpen={isAddInventoryDialogOpen}
        onClose={() => setIsAddInventoryDialogOpen(false)}
      />
      <ScanItemDialog
        isOpen={isScanItemDialogOpen}
        onClose={() => setIsScanItemDialogOpen(false)}
      />
    </div>
  );
};

export default ClassicDashboard;