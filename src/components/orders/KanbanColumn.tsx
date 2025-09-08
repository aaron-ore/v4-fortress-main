import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import OrderCard from "./OrderCard";
import { OrderItem } from "@/context/OrdersContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface KanbanColumnProps {
  id: string;
  title: string;
  orders: OrderItem[];
  onOrderClick: (order: OrderItem) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, orders, onOrderClick }) => {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <Card className="flex flex-col w-full min-w-[280px] max-w-[350px] bg-card border-border rounded-lg shadow-md flex-shrink-0">
      <CardHeader className="p-4 pb-2 border-b border-border">
        <CardTitle className="text-lg font-semibold text-foreground flex justify-between items-center">
          {title}
          <span className="text-sm text-muted-foreground font-normal">({orders.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex-grow overflow-hidden">
        <ScrollArea className="h-full max-h-[calc(100vh-280px)] pr-2"> {/* Adjust max-height dynamically */}
          <SortableContext id={id} items={orders.map(order => order.id)} strategy={verticalListSortingStrategy}>
            <div ref={setNodeRef} className="space-y-4 min-h-[100px]"> {/* min-h to ensure droppable area */}
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} onClick={onOrderClick} />
              ))}
            </div>
          </SortableContext>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default KanbanColumn;