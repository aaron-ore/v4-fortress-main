"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { useProfile } from "./ProfileContext";

export interface Customer {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  organizationId: string | null;
  createdAt: string;
}

interface CustomerContextType {
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, "id" | "createdAt" | "organizationId">) => Promise<void>;
  updateCustomer: (updatedCustomer: Customer) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;
  refreshCustomers: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const CustomerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { profile, isLoadingProfile } = useProfile();

  const fetchCustomers = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      setCustomers([]);
      return;
    }

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching customers:", error);
      showError("Failed to load customers.");
      setCustomers([]);
    } else {
      const fetchedCustomers: Customer[] = data.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        contactPerson: customer.contact_person || undefined,
        email: customer.email || undefined,
        phone: customer.phone || undefined,
        address: customer.address || undefined,
        notes: customer.notes || undefined,
        organizationId: customer.organization_id,
        createdAt: customer.created_at,
      }));
      setCustomers(fetchedCustomers);
    }
  }, [profile?.organizationId]);

  useEffect(() => {
    if (!isLoadingProfile) {
      fetchCustomers();
    }
  }, [fetchCustomers, isLoadingProfile]);

  const addCustomer = async (customer: Omit<Customer, "id" | "createdAt" | "organizationId">) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("You must be logged in and have an organization ID to add customers.");
      return;
    }

    const { data, error } = await supabase
      .from("customers")
      .insert({
        name: customer.name,
        contact_person: customer.contactPerson,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        notes: customer.notes,
        user_id: session.user.id,
        organization_id: profile.organizationId,
      })
      .select();

    if (error) {
      console.error("Error adding customer:", error);
      showError(`Failed to add customer: ${error.message}`);
    } else if (data && data.length > 0) {
      const newCustomer: Customer = {
        id: data[0].id,
        name: data[0].name,
        contactPerson: data[0].contact_person || undefined,
        email: data[0].email || undefined,
        phone: data[0].phone || undefined,
        address: data[0].address || undefined,
        notes: data[0].notes || undefined,
        organizationId: data[0].organization_id,
        createdAt: data[0].created_at,
      };
      setCustomers((prevCustomers) => [...prevCustomers, newCustomer]);
      showSuccess(`Customer "${customer.name}" added successfully!`);
    }
  };

  const updateCustomer = async (updatedCustomer: Customer) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("You must be logged in and have an organization ID to update customers.");
      return;
    }

    const { data, error } = await supabase
      .from("customers")
      .update({
        name: updatedCustomer.name,
        contact_person: updatedCustomer.contactPerson,
        email: updatedCustomer.email,
        phone: updatedCustomer.phone,
        address: updatedCustomer.address,
        notes: updatedCustomer.notes,
      })
      .eq("id", updatedCustomer.id)
      .eq("organization_id", profile.organizationId)
      .select();

    if (error) {
      console.error("Error updating customer:", error);
      showError(`Failed to update customer: ${error.message}`);
    } else if (data && data.length > 0) {
      const updatedCustomerFromDB: Customer = {
        id: data[0].id,
        name: data[0].name,
        contactPerson: data[0].contact_person || undefined,
        email: data[0].email || undefined,
        phone: data[0].phone || undefined,
        address: data[0].address || undefined,
        notes: data[0].notes || undefined,
        organizationId: data[0].organization_id,
        createdAt: data[0].created_at,
      };
      setCustomers((prevCustomers) =>
        prevCustomers.map((customer) =>
          customer.id === updatedCustomerFromDB.id ? updatedCustomerFromDB : customer,
        ),
      );
      showSuccess(`Customer "${updatedCustomer.name}" updated successfully!`);
    }
  };

  const deleteCustomer = async (customerId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("You must be logged in and have an organization ID to delete customers.");
      return;
    }

    const customerToDelete = customers.find(c => c.id === customerId);

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customerId)
      .eq("organization_id", profile.organizationId);

    if (error) {
      console.error("Error deleting customer:", error);
      showError(`Failed to delete customer: ${error.message}`);
    } else {
      setCustomers((prevCustomers) => prevCustomers.filter(customer => customer.id !== customerId));
      showSuccess("Customer deleted successfully!");
    }
  };

  const refreshCustomers = async () => {
    await fetchCustomers();
  };

  return (
    <CustomerContext.Provider value={{ customers, addCustomer, updateCustomer, deleteCustomer, refreshCustomers }}>
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomers = () => {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error("useCustomers must be used within a CustomerProvider");
  }
  return context;
};