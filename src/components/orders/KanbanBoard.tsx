import React, { useState, useMemo } from "react";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import KanbanColumn from "./KanbanColumn";
import { OrderItem, useOrders } from "@/context/OrdersContext";
import { showSuccess, showError } from "@/utils/toast";

interface KanbanBoardProps {
  onOrderClick: (order: OrderItem) => void;
  filteredOrders: OrderItem[]; // Pass filtered orders from parent
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ onOrderClick, filteredOrders }) => {
  const { orders, updateOrder } = useOrders();

  // Define Kanban columns and their corresponding statuses
  const columns = useMemo(() => [
    { id: "new-order", title: "New Order", status: "New Order" },
    { id: "processing", title: "Processing", status: "Processing" },
    { id: "packed", title: "Packed", status: "Packed" },
    { id: "shipped", title: "Shipped", status: "Shipped" },
    { id: "on-hold-problem", title: "On Hold / Problem", status: "On Hold / Problem" },
  ], []);

  // Group filtered orders by status for each column
  const ordersByColumn = useMemo(() => {
    const grouped: Record<string, OrderItem[]> = {};
    columns.forEach(col => {
      grouped[col.status] = filteredOrders.filter(order => order.status === col.status);
    });
    return grouped;
  }, [filteredOrders, columns]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeOrder = orders.find(order => order.id === activeId);
    if (!activeOrder) return;

    const sourceColumnStatus = activeOrder.status;
    const foundColumn = columns.find(col => col.id === overId);

    let targetColumnStatus: OrderItem['status'];
    if (foundColumn) {
      targetColumnStatus = foundColumn.status as OrderItem['status']; // Explicitly cast
    } else {
      targetColumnStatus = sourceColumnStatus;
    }

    if (sourceColumnStatus === targetColumnStatus) {
      return;
    }

    const updatedOrder = { ...activeOrder, status: targetColumnStatus };
    updateOrder(updatedOrder);
    showSuccess(`Order ${activeOrder.id} moved to "${targetColumnStatus}"!`);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            orders={ordersByColumn[column.status] || []}
            onOrderClick={onOrderClick}
          />
        ))}
      </div>
    </DndContext>
  );
};

export default KanbanBoard;