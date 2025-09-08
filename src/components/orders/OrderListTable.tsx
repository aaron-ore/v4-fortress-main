import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { OrderItem } from "@/context/OrdersContext";
import { format, isValid } from "date-fns"; // Import isValid
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge"; // Import Badge

interface OrderListTableProps {
  filteredOrders: OrderItem[];
  onOrderClick: (order: OrderItem) => void;
}

const OrderListTable: React.FC<OrderListTableProps> = ({ filteredOrders, onOrderClick }) => {
  return (
    <Card className="bg-card border-border rounded-lg shadow-sm">
      <CardContent className="p-4">
        {filteredOrders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No orders match your current filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Order ID</TableHead>
                  <TableHead className="w-[150px]">Type</TableHead>
                  <TableHead>Customer/Supplier</TableHead>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[120px]">Due Date</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="text-right w-[100px]">Items</TableHead>
                  <TableHead className="text-right w-[120px]">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const today = new Date();
                  const dueDateObj = new Date(order.dueDate); // Create Date object
                  const isDueDateValid = isValid(dueDateObj); // Check validity

                  const isOverdue = isDueDateValid && dueDateObj < today && order.status !== "Shipped" && order.status !== "Packed";
                  const isDueSoon = isDueDateValid && dueDateObj > today && dueDateObj <= new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000) && order.status !== "Shipped" && order.status !== "Packed";

                  const dueDateClass = cn(
                    "font-medium",
                    isOverdue && "text-destructive",
                    isDueSoon && "text-yellow-500",
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

                  return (
                    <TableRow key={order.id} onClick={() => onOrderClick(order)} className="cursor-pointer hover:bg-muted/20">
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>
                        <Badge variant={order.type === "Sales" ? "info" : "default"}>
                          {order.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="truncate max-w-[200px]">{order.customerSupplier}</TableCell>
                      <TableCell>{format(new Date(order.date), "MMM dd, yyyy")}</TableCell>
                      <TableCell className={dueDateClass}>{isDueDateValid ? format(dueDateObj, "MMM dd, yyyy") : "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{order.itemCount}</TableCell>
                      <TableCell className="text-right font-semibold">${order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderListTable;