import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError } from "@/utils/toast";
import { useProfile } from "./ProfileContext";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate
import { isValid } from "date-fns"; // Import isValid for date validation

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: "add" | "subtract";
  amount: number;
  oldQuantity: number;
  newQuantity: number;
  reason: string;
  timestamp: string;
  organizationId: string | null;
  userId: string; // NEW: Add userId to StockMovement interface
}

interface StockMovementContextType {
  stockMovements: StockMovement[];
  addStockMovement: (movement: Omit<StockMovement, "id" | "timestamp" | "organizationId" | "userId">) => Promise<void>;
  fetchStockMovements: (itemId?: string) => Promise<void>;
}

const StockMovementContext = createContext<StockMovementContextType | undefined>(undefined);

export const StockMovementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const { profile, isLoadingProfile } = useProfile();

  const mapSupabaseMovementToStockMovement = (movement: any): StockMovement => {
    const amount = parseInt(movement.amount || '0');
    const oldQuantity = parseInt(movement.old_quantity || '0');
    const newQuantity = parseInt(movement.new_quantity || '0');

    // Ensure timestamp is always a valid ISO string
    const validatedTimestamp = parseAndValidateDate(movement.timestamp);
    const timestampString = validatedTimestamp ? validatedTimestamp.toISOString() : new Date().toISOString(); // Fallback to current date if invalid

    return {
      id: movement.id || "",
      itemId: movement.item_id || "",
      itemName: movement.item_name || "",
      type: movement.type || "add",
      amount: isNaN(amount) ? 0 : amount,
      oldQuantity: isNaN(oldQuantity) ? 0 : oldQuantity,
      newQuantity: isNaN(newQuantity) ? 0 : newQuantity,
      reason: movement.reason || "",
      timestamp: timestampString,
      organizationId: movement.organization_id,
      userId: movement.user_id || "", // Map user_id
    };
  };

  const fetchStockMovements = useCallback(async (itemId?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      setStockMovements([]);
      return;
    }

    let query = supabase
      .from("stock_movements")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .order("timestamp", { ascending: false });

    if (itemId) {
      query = query.eq("item_id", itemId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching stock movements:", error);
      showError("Failed to load stock movements.");
    } else {
      const fetchedMovements: StockMovement[] = data.map(mapSupabaseMovementToStockMovement);
      setStockMovements(fetchedMovements);
    }
  }, [profile?.organizationId]);

  useEffect(() => {
    if (!isLoadingProfile) {
      fetchStockMovements();
    }
  }, [fetchStockMovements, isLoadingProfile]);

  const addStockMovement = async (movement: Omit<StockMovement, "id" | "timestamp" | "organizationId" | "userId">) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("You must be logged in and have an organization ID to log stock movements.");
      return;
    }

    const { data, error } = await supabase
      .from("stock_movements")
      .insert({
        item_id: movement.itemId,
        item_name: movement.itemName,
        type: movement.type,
        amount: movement.amount,
        old_quantity: movement.oldQuantity,
        new_quantity: movement.newQuantity,
        reason: movement.reason,
        user_id: session.user.id,
        organization_id: profile.organizationId,
      })
      .select();

    if (error) {
      console.error("Error adding stock movement:", error);
      showError(`Failed to log stock movement: ${error.message}`);
    } else if (data && data.length > 0) {
      const newMovement: StockMovement = mapSupabaseMovementToStockMovement(data[0]);
      setStockMovements((prev) => [newMovement, ...prev]);
    }
  };

  return (
    <StockMovementContext.Provider value={{ stockMovements, addStockMovement, fetchStockMovements }}>
      {children}
    </StockMovementContext.Provider>
  );
};

export const useStockMovement = () => {
  const context = useContext(StockMovementContext);
  if (context === undefined) {
    throw new Error("useStockMovement must be used within a StockMovementProvider");
  }
  return context;
};