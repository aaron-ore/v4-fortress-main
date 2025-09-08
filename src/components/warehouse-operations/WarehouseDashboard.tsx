import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BellRing, PackageMinus, Info, CheckCircle, XCircle, TrendingUp, Boxes, Package, Truck } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";
import { useInventory } from "@/context/InventoryContext";
import { useOrders } from "@/context/OrdersContext";
import { formatDistanceToNowStrict } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

const WarehouseDashboard: React.FC = () => {
  const { notifications, markNotificationAsRead } = useNotifications();
  const { inventoryItems } = useInventory();
  const { orders } = useOrders();

  const unreadNotifications = notifications.filter(n => !n.isRead).slice(0, 5); // Show top 5 unread
  const lowStockItems = inventoryItems.filter(item => item.quantity <= item.reorderLevel).slice(0, 3); // Top 3 low stock
  const outOfStockItems = inventoryItems.filter(item => item.quantity === 0).slice(0, 3); // Top 3 out of stock
  const pendingReceives = orders.filter(order => order.type === "Purchase" && order.status !== "Shipped").slice(0, 3); // Top 3 pending POs
  const pendingShipments = orders.filter(order => order.type === "Sales" && order.status !== "Shipped" && order.status !== "Packed").slice(0, 3); // Top 3 pending SOs

  const getIconForNotificationType = (type: string) => {
    switch (type) {
      case "warning": return <PackageMinus className="h-4 w-4 text-destructive" />;
      case "success": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error": return <XCircle className="h-4 w-4 text-red-500" />;
      case "info":
      default: return <Info className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <ScrollArea className="h-full pb-4">
      <div className="space-y-4">
        {/* Notifications Card */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" /> Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unreadNotifications.length > 0 ? (
              unreadNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className="flex items-start gap-2 p-2 bg-muted/10 rounded-md cursor-pointer hover:bg-muted/20"
                  onClick={() => markNotificationAsRead(notif.id)}
                >
                  {getIconForNotificationType(notif.type)}
                  <div>
                    <p className="text-sm font-medium text-foreground">{notif.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(notif.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground text-sm py-4">No unread notifications.</p>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Items Card */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <PackageMinus className="h-5 w-5 text-destructive" /> Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStockItems.length > 0 ? (
              lowStockItems.map(item => (
                <div key={item.id} className="flex justify-between items-center p-2 bg-muted/10 rounded-md">
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <span className="text-sm text-red-400">{item.quantity} units</span>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground text-sm py-4">No items currently at low stock.</p>
            )}
          </CardContent>
        </Card>

        {/* Out of Stock Items Card */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" /> Out of Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {outOfStockItems.length > 0 ? (
              outOfStockItems.map(item => (
                <div key={item.id} className="flex justify-between items-center p-2 bg-muted/10 rounded-md">
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <span className="text-sm text-red-500">0 units</span>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground text-sm py-4">No items currently out of stock.</p>
            )}
          </CardContent>
        </Card>

        {/* Pending Receives Card */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-accent" /> Pending Receives
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingReceives.length > 0 ? (
              pendingReceives.map(order => (
                <div key={order.id} className="flex justify-between items-center p-2 bg-muted/10 rounded-md">
                  <p className="text-sm font-medium text-foreground">{order.id} - {order.customerSupplier}</p>
                  <span className="text-sm text-muted-foreground">Due: {order.dueDate}</span>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground text-sm py-4">No pending purchase orders.</p>
            )}
          </CardContent>
        </Card>

        {/* Pending Shipments Card */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" /> Pending Shipments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingShipments.length > 0 ? (
              pendingShipments.map(order => (
                <div key={order.id} className="flex justify-between items-center p-2 bg-muted/10 rounded-md">
                  <p className="text-sm font-medium text-foreground">{order.id} - {order.customerSupplier}</p>
                  <span className="text-sm text-muted-foreground">Due: {order.dueDate}</span>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground text-sm py-4">No pending sales orders.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};

export default WarehouseDashboard;