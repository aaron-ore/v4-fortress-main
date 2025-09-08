import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck } from "lucide-react";
import { useOrders } from "@/context/OrdersContext";
import { format, isValid } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

const RecentShipmentsCard: React.FC = () => {
  const { orders } = useOrders();

  const recentShipments = useMemo(() => {
    return orders
      .filter(order => order.type === "Sales" && order.status === "Shipped")
      .sort((a, b) => {
        const dateA = parseAndValidateDate(a.date);
        const dateB = parseAndValidateDate(b.date);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime(); // Sort by most recent first
      })
      .slice(0, 5); // Show top 5
  }, [orders]);

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4 flex flex-col h-[310px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-foreground">Recent Shipments</CardTitle>
        <Truck className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow flex flex-col justify-between">
        {recentShipments.length > 0 ? (
          <ScrollArea className="flex-grow max-h-[180px] pr-2">
            <ul className="text-sm space-y-2">
              {recentShipments.map((shipment) => {
                const shipDate = parseAndValidateDate(shipment.date);
                return (
                  <li key={shipment.id} className="flex justify-between items-center">
                    <span>{shipment.id} - {shipment.customerSupplier}</span>
                    <span className="text-muted-foreground text-xs">
                      {shipDate && isValid(shipDate) ? format(shipDate, "MMM dd") : "N/A"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        ) : (
          <p className="text-center text-muted-foreground text-sm py-4 flex-grow flex items-center justify-center">No recent shipments.</p>
        )}
        <p className="text-xs text-muted-foreground mt-auto text-center">Recently dispatched sales orders.</p>
      </CardContent>
    </Card>
  );
};

export default RecentShipmentsCard;