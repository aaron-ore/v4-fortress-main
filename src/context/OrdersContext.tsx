"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { useProfile } from "./ProfileContext";
import { generateSequentialNumber } from "@/utils/numberGenerator"; // Import generateSequentialNumber
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate
import { isValid } from "date-fns"; // Import isValid for date validation

export interface POItem {
  id: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  inventoryItemId?: string;
}

export interface OrderItem {
  id: string;
  type: "Sales" | "Purchase";
  customerSupplier: string;
  date: string;
  status: "New Order" | "Processing" | "Packed" | "Shipped" | "On Hold / Problem" | "Archived";
  totalAmount: number;
  dueDate: string;
  itemCount: number;
  notes: string;
  orderType: "Retail" | "Wholesale";
  shippingMethod: "Standard" | "Express";
  deliveryRoute?: string;
  items: POItem[];
  organizationId: string | null;
  terms?: string;
  putawayStatus?: "Pending" | "Completed"; // NEW: Add putawayStatus for Purchase Orders
}

interface OrdersContextType {
  orders: OrderItem[];
  updateOrder: (updatedOrder: OrderItem) => void;
  addOrder: (newOrder: Omit<OrderItem, "id" | "organizationId"> & { id?: string }) => Promise<void>; // id is now explicitly optional
  archiveOrder: (orderId: string) => void;
  fetchOrders: () => Promise<void>;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

const initialOrders: OrderItem[] = [];

export const OrdersProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [orders, setOrders] = useState<OrderItem[]>(initialOrders);
  const { profile, isLoadingProfile } = useProfile();

  const mapSupabaseOrderItemToOrderItem = (order: any): OrderItem => {
    const totalAmount = parseFloat(order.total_amount || '0');
    const itemCount = parseInt(order.item_count || '0');
    const items: POItem[] = (order.items || []).map((item: any) => ({
      id: item.id,
      itemName: item.itemName || "",
      quantity: parseInt(item.quantity || '0'),
      unitPrice: parseFloat(item.unitPrice || '0'),
      inventoryItemId: item.inventoryItemId || undefined,
    }));

    // Ensure created_at and due_date are always valid ISO strings
    const validatedCreatedAt = parseAndValidateDate(order.created_at);
    const createdAtString = validatedCreatedAt ? validatedCreatedAt.toISOString() : new Date().toISOString(); // Fallback to current date if invalid

    const validatedDueDate = parseAndValidateDate(order.due_date);
    const dueDateString = validatedDueDate ? validatedDueDate.toISOString() : new Date().toISOString(); // Fallback to current date if invalid

    return {
      id: order.id || "",
      type: order.type || "Sales",
      customerSupplier: order.customer_supplier || "",
      date: createdAtString,
      status: order.status || "New Order",
      totalAmount: isNaN(totalAmount) ? 0 : totalAmount,
      dueDate: dueDateString,
      itemCount: isNaN(itemCount) ? 0 : itemCount,
      notes: order.notes || "",
      orderType: order.order_type || "Retail",
      shippingMethod: order.shipping_method || "Standard",
      deliveryRoute: order.delivery_route || undefined,
      items: items,
      organizationId: order.organization_id,
      terms: order.terms || undefined,
      putawayStatus: order.putaway_status || undefined, // NEW: Map putaway_status
    };
  };

  const fetchOrders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      setOrders([]);
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      showError("Failed to load orders.");
      setOrders([]);
    } else {
      const fetchedOrders: OrderItem[] = data.map(mapSupabaseOrderItemToOrderItem);
      setOrders(fetchedOrders);
    }
  }, [profile?.organizationId]);

  useEffect(() => {
    if (!isLoadingProfile) {
      fetchOrders();
    }
  }, [fetchOrders, isLoadingProfile]);

  const updateOrder = async (updatedOrder: OrderItem) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("You must be logged in and have an organization ID to update orders.");
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .update({
        type: updatedOrder.type,
        customer_supplier: updatedOrder.customerSupplier,
        status: updatedOrder.status,
        total_amount: updatedOrder.totalAmount,
        due_date: updatedOrder.dueDate,
        item_count: updatedOrder.itemCount,
        notes: updatedOrder.notes,
        order_type: updatedOrder.orderType,
        shipping_method: updatedOrder.shippingMethod,
        delivery_route: updatedOrder.deliveryRoute,
        items: updatedOrder.items,
        terms: updatedOrder.terms,
        putaway_status: updatedOrder.putawayStatus, // NEW: Update putaway_status
      })
      .eq("id", updatedOrder.id)
      .eq("organization_id", profile.organizationId)
      .select();

    if (error) {
      console.error("Error updating order:", error);
      showError(`Failed to update order: ${error.message}`);
    } else if (data && data.length > 0) {
      const addedOrder: OrderItem = mapSupabaseOrderItemToOrderItem(data[0]);
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === updatedOrder.id ? addedOrder : order,
        ),
      );
      showSuccess(`Order ${updatedOrder.id} updated successfully!`);
    }
  };

  const addOrder = async (newOrder: Omit<OrderItem, "id" | "organizationId"> & { id?: string }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("You must be logged in and have an organization ID to add orders.");
      return;
    }

    const finalOrderId = newOrder.id || generateSequentialNumber(newOrder.type === "Sales" ? "SO" : "PO");

    const { data, error } = await supabase
      .from("orders")
      .insert({
        id: finalOrderId,
        type: newOrder.type,
        customer_supplier: newOrder.customerSupplier,
        created_at: newOrder.date,
        status: newOrder.status,
        total_amount: newOrder.totalAmount,
        due_date: newOrder.dueDate,
        item_count: newOrder.itemCount,
        notes: newOrder.notes,
        order_type: newOrder.orderType,
        shipping_method: newOrder.shippingMethod,
        delivery_route: newOrder.deliveryRoute,
        items: newOrder.items,
        terms: newOrder.terms,
        user_id: session.user.id,
        organization_id: profile.organizationId,
        putaway_status: newOrder.type === "Purchase" ? "Pending" : undefined, // NEW: Set putawayStatus for new Purchase Orders
      })
      .select();

    if (error) {
      console.error("Error adding order:", error);
      showError(`Failed to add order: ${error.message}`);
    } else if (data && data.length > 0) {
      const addedOrder: OrderItem = mapSupabaseOrderItemToOrderItem(data[0]);
      setOrders((prevOrders) => [...prevOrders, addedOrder]);
      showSuccess(`Order ${addedOrder.id} created successfully!`);
    }
  };

  const archiveOrder = async (orderId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("You must be logged in and have an organization ID to archive orders.");
      return;
    }

    const orderToArchive = orders.find(o => o.id === orderId);

    const { error } = await supabase
      .from("orders")
      .update({ status: "Archived" })
      .eq("id", orderId)
      .eq("organization_id", profile.organizationId);

    if (error) {
      console.error("Error archiving order:", error);
      showError(`Failed to archive order: ${error.message}`);
    } else {
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, status: "Archived" } : order,
        ),
      );
      showSuccess(`Order ${orderId} has been archived.`);
    }
  };

  return (
    <OrdersContext.Provider value={{ orders, updateOrder, addOrder, archiveOrder, fetchOrders }}>
      {children}
    </OrdersContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrdersContext);
  if (context === undefined) {
    throw new Error("useOrders must be used within an OrdersProvider");
  }
  return context;
};