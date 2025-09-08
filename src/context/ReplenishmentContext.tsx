import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { useProfile } from "./ProfileContext";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate
import { isValid } from "date-fns"; // Import isValid for date validation

export interface ReplenishmentTask {
  id: string;
  itemId: string;
  itemName: string;
  fromLocation: string;
  toLocation: string;
  quantity: number;
  status: "Pending" | "Assigned" | "Completed" | "Cancelled";
  assignedTo?: string; // User ID of the operator
  createdAt: string;
  completedAt?: string;
  organizationId: string | null;
}

interface ReplenishmentContextType {
  replenishmentTasks: ReplenishmentTask[];
  addReplenishmentTask: (task: Omit<ReplenishmentTask, "id" | "createdAt" | "organizationId" | "status" | "completedAt">) => Promise<void>;
  updateReplenishmentTask: (updatedTask: ReplenishmentTask) => Promise<void>;
  fetchReplenishmentTasks: () => Promise<void>;
}

const ReplenishmentContext = createContext<ReplenishmentContextType | undefined>(undefined);

export const ReplenishmentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [replenishmentTasks, setReplenishmentTasks] = useState<ReplenishmentTask[]>([]);
  const { profile, isLoadingProfile } = useProfile();

  const mapSupabaseTaskToReplenishmentTask = (task: any): ReplenishmentTask => {
    const quantity = parseInt(task.quantity || '0');

    // Ensure createdAt is always a valid ISO string
    const validatedCreatedAt = parseAndValidateDate(task.created_at);
    const createdAtString = validatedCreatedAt ? validatedCreatedAt.toISOString() : new Date().toISOString(); // Fallback to current date if invalid

    // Ensure completedAt is valid or keep undefined if not present
    const validatedCompletedAt = parseAndValidateDate(task.completed_at);
    const completedAtString = validatedCompletedAt ? validatedCompletedAt.toISOString() : undefined; // Fallback to undefined if invalid

    return {
      id: task.id || "",
      itemId: task.item_id || "",
      itemName: task.item_name || "",
      fromLocation: task.from_location || "",
      toLocation: task.to_location || "",
      quantity: isNaN(quantity) ? 0 : quantity,
      status: task.status || "Pending",
      assignedTo: task.assigned_to || undefined,
      createdAt: createdAtString,
      completedAt: completedAtString,
      organizationId: task.organization_id,
    };
  };

  const fetchReplenishmentTasks = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      setReplenishmentTasks([]);
      return;
    }

    const { data, error } = await supabase
      .from("replenishment_tasks")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching replenishment tasks:", error);
      showError("Failed to load replenishment tasks.");
      setReplenishmentTasks([]); // Return empty array on error
    } else {
      const fetchedTasks: ReplenishmentTask[] = data.map(mapSupabaseTaskToReplenishmentTask);
      setReplenishmentTasks(fetchedTasks); // Set fetched data, could be empty
    }
  }, [profile?.organizationId]);

  useEffect(() => {
    if (!isLoadingProfile) {
      fetchReplenishmentTasks();
    }
  }, [fetchReplenishmentTasks, isLoadingProfile]);

  const addReplenishmentTask = async (task: Omit<ReplenishmentTask, "id" | "createdAt" | "organizationId" | "status" | "completedAt">) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("You must be logged in and have an organization ID to add replenishment tasks.");
      return;
    }

    const { data, error } = await supabase
      .from("replenishment_tasks")
      .insert({
        item_id: task.itemId,
        item_name: task.itemName,
        from_location: task.fromLocation,
        to_location: task.toLocation,
        quantity: task.quantity,
        status: "Pending", // Default status
        user_id: session.user.id,
        organization_id: profile.organizationId,
      })
      .select();

    if (error) {
      console.error("Error adding replenishment task:", error);
      showError(`Failed to add replenishment task: ${error.message}`);
    } else if (data && data.length > 0) {
      const newTask: ReplenishmentTask = mapSupabaseTaskToReplenishmentTask(data[0]);
      setReplenishmentTasks((prev) => [newTask, ...prev]);
      showSuccess(`Replenishment task for ${task.itemName} created!`);
    }
  };

  const updateReplenishmentTask = async (updatedTask: ReplenishmentTask) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("You must be logged in and have an organization ID to update replenishment tasks.");
      return;
    }

    const { data, error } = await supabase
      .from("replenishment_tasks")
      .update({
        item_id: updatedTask.itemId,
        item_name: updatedTask.itemName,
        from_location: updatedTask.fromLocation,
        to_location: updatedTask.toLocation,
        quantity: updatedTask.quantity,
        status: updatedTask.status,
        assigned_to: updatedTask.assignedTo,
        completed_at: updatedTask.completedAt,
      })
      .eq("id", updatedTask.id)
      .eq("organization_id", profile.organizationId)
      .select();

    if (error) {
      console.error("Error updating replenishment task:", error);
      showError(`Failed to update replenishment task: ${error.message}`);
    } else if (data && data.length > 0) {
      const updatedTaskFromDB: ReplenishmentTask = mapSupabaseTaskToReplenishmentTask(data[0]);
      setReplenishmentTasks((prev) =>
        prev.map((task) =>
          task.id === updatedTask.id ? updatedTaskFromDB : task,
        ),
      );
      showSuccess(`Replenishment task ${updatedTask.id} updated to ${updatedTask.status}.`);
    }
  };

  return (
    <ReplenishmentContext.Provider value={{ replenishmentTasks, addReplenishmentTask, updateReplenishmentTask, fetchReplenishmentTasks }}>
      {children}
    </ReplenishmentContext.Provider>
  );
};

export const useReplenishment = () => {
  const context = useContext(ReplenishmentContext);
  if (context === undefined) {
    throw new Error("useReplenishment must be used within a ReplenishmentProvider");
  }
  return context;
};