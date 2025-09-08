import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { OrderItem } from "@/context/OrdersContext";
import { cn } from "@/lib/utils";
import { Package, Calendar, MessageSquare, Truck, ShoppingCart } from "lucide-react";
import { format, isValid } from "date-fns"; // Import isValid
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge"; // Import Badge

interface OrderCardProps {
  order: OrderItem;
  onClick: (order: OrderItem) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onClick }) => {
  const today = new Date();
  const dueDateObj = new Date(order.dueDate); // Create Date object
  const isDueDateValid = isValid(dueDateObj); // Check validity

  const isOverdue = isDueDateValid && dueDateObj < today && order.status !== "Shipped" && order.status !== "Packed";
  const isDueSoon = isDueDateValid && dueDateObj > today && dueDateObj <= new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000) && order.status !== "Shipped" && order.status !== "Packed"; // Due within 2 days

  const dueDateClass = cn(
    "text-xs font-medium flex items-center gap-1",
    isOverdue && "text-destructive",
    isDueSoon && "text-yellow-500",
    !isOverdue && !isDueSoon && "text-muted-foreground"
  );

  let statusVariant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "muted" = "info";
  switch (order.status) {
    case "New Order":
      statusVariant = "default";
      break;
    case "Processing":
      statusVariant = "secondary";
      break;
    case "Packed":
      statusVariant = "outline";
      break;
    case "Shipped":
      statusVariant = "muted";
      break;
    case "On Hold / Problem":
      statusVariant = "warning";
      break;
    case "Archived":
      statusVariant = "destructive";
      break;
  }

  const orderTypeVariant = order.orderType === "Retail" ? "info" : "default"; // Using info for Retail, default for Wholesale
  const shippingMethodVariant = order.shippingMethod === "Express" ? "destructive" : "success"; // Using destructive for Express, success for Standard

  return (
    <Card
      className="bg-card border-border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick(order)}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-foreground text-sm truncate">{order.id}</h3>
          <div className="flex items-center gap-1">
            {order.type === "Sales" ? (
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Truck className="h-4 w-4 text-muted-foreground" />
            )}
            {order.notes && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <MessageSquare className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{order.notes}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {order.customerSupplier}
        </p>
        <div className="flex justify-between items-center text-xs">
          <span className={dueDateClass}>
            <Calendar className="h-3 w-3" /> Due: {isDueDateValid ? format(dueDateObj, "MMM dd") : "N/A"}
          </span>
          <span className="text-muted-foreground flex items-center gap-1">
            <Package className="h-3 w-3" /> {order.itemCount} Items
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          <Badge variant={orderTypeVariant}>
            {order.orderType}
          </Badge>
          <Badge variant={shippingMethodVariant}>
            {order.shippingMethod}
          </Badge>
          <Badge variant={statusVariant}>
            {order.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderCard;