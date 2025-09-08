import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag } from "lucide-react";
import { useOrders } from "@/context/OrdersContext";
import { format, isValid } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate

const OpenPurchaseOrdersCard: React.FC = () => {
  const { orders } = useOrders();

  const openPurchaseOrders = useMemo(() => {
    return orders
      .filter(order => order.type === "Purchase" && order.status !== "Shipped" && order.status !== "Archived")
      .sort((a, b) => {
        const dateA = parseAndValidateDate(a.dueDate);
        const dateB = parseAndValidateDate(b.dueDate);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime(); // Sort by earliest due date first
      })
      .slice(0, 5); // Show top 5
  }, [orders]);

  return (
    <Card className="bg-card border-border rounded-lg shadow-sm p-4 flex flex-col h-[310px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-foreground">Open Purchase Orders</CardTitle>
        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow flex flex-col justify-between">
        {openPurchaseOrders.length > 0 ? (
          <ScrollArea className="flex-grow max-h-[180px] pr-2">
            <ul className="text-sm space-y-2">
              {openPurchaseOrders.map((po) => {
                const dueDate = parseAndValidateDate(po.dueDate);
                return (
                  <li key={po.id} className="flex justify-between items-center">
                    <span>{po.id} - {po.customerSupplier}</span>
                    <span className="text-muted-foreground text-xs">
                      Due: {dueDate && isValid(dueDate) ? format(dueDate, "MMM dd") : "N/A"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        ) : (
          <p className="text-center text-muted-foreground text-sm py-4 flex-grow flex items-center justify-center">No open purchase orders.</p>
        )}
        <p className="text-xs text-muted-foreground mt-auto text-center">POs awaiting fulfillment from suppliers.</p>
      </CardContent>
    </Card>
  );
};

export default OpenPurchaseOrdersCard;