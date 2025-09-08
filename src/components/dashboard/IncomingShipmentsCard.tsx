import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck } from "lucide-react";
import { useOrders } from "@/context/OrdersContext";
import { formatDistanceToNowStrict, isValid } from "date-fns";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

const IncomingShipmentsCard: React.FC = () => {
  const { orders } = useOrders();

  const incomingPurchaseOrders = useMemo(() => {
    return orders
      .filter(order => order.type === "Purchase" && order.status !== "Shipped")
      .sort((a, b) => {
        const dateA = parseAndValidateDate(a.dueDate);
        const dateB = parseAndValidateDate(b.dueDate);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 3);
  }, [orders]);

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-foreground">Incoming Shipments / Pending POs</CardTitle>
        <Truck className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-4 pt-0 flex flex-col justify-between h-full">
        {incomingPurchaseOrders.length > 0 ? (
          <ul className="text-sm space-y-2">
            {incomingPurchaseOrders.map((po) => {
              const dueDate = parseAndValidateDate(po.dueDate);
              return (
                  <li key={po.id} className="flex justify-between items-center">
                    <span>{po.id} - {po.customerSupplier}</span>
                    <span className="text-muted-foreground text-xs">
                      ETA: {dueDate && isValid(dueDate) ? formatDistanceToNowStrict(dueDate, { addSuffix: true }) : "N/A"} ({po.status})
                    </span>
                  </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-center text-muted-foreground text-sm py-4">No incoming shipments or pending POs.</p>
        )}
        <p className="text-xs text-muted-foreground mt-auto text-center">List of shipments due from suppliers.</p>
      </CardContent>
    </Card>
  );
};

export default IncomingShipmentsCard;