import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { useProfile } from "./ProfileContext";
// REMOVED: import { mockCategories } from "@/utils/mockData";
// REMOVED: import { useActivityLogs } from "./ActivityLogContext";

export interface Category { // Exported interface
  id: string;
  name: string;
  organizationId: string | null;
}

interface CategoryContextType {
  categories: Category[];
  addCategory: (name: string) => Promise<Category | null>;
  removeCategory: (id: string) => Promise<void>;
  refreshCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const CategoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const { profile, isLoadingProfile } = useProfile();
  // REMOVED: const { addActivity } = useActivityLogs();

  const fetchCategories = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      setCategories([]);
      return;
    }

    const { data, error } = await supabase
      .from("categories")
      .select("id, name, organization_id")
      .eq("organization_id", profile.organizationId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      showError("Failed to load categories.");
      setCategories([]); // Return empty array on error
    } else {
      const fetchedCategories: Category[] = data.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        organizationId: cat.organization_id, // Mapped organization_id to organizationId
      }));
      setCategories(fetchedCategories); // Set fetched data, could be empty
    }
  }, [profile?.organizationId]);

  useEffect(() => {
    if (!isLoadingProfile) {
      fetchCategories();
    }
  }, [fetchCategories, isLoadingProfile]);

  const addCategory = async (name: string): Promise<Category | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("You must be logged in and have an organization ID to add categories.");
      return null;
    }

    const trimmedName = name.trim();
    const existingCategory = categories.find(cat => cat.name.toLowerCase() === trimmedName.toLowerCase());
    if (existingCategory) {
      // REMOVED: addActivity("Category Add Skipped", `Attempted to add existing category: ${trimmedName}.`, { categoryName: trimmedName });
      return existingCategory;
    }

    const { data, error } = await supabase
      .from("categories")
      .insert({ name: trimmedName, user_id: session.user.id, organization_id: profile.organizationId })
      .select();

    if (error) {
      if (error.code === '23505') {
        console.warn(`Category "${trimmedName}" already exists in DB, likely added concurrently.`);
        const { data: existingDbCategory, error: fetchError } = await supabase
          .from("categories")
          .select("id, name, organization_id")
          .eq("name", trimmedName)
          .eq("organization_id", profile.organizationId)
          .single();
        if (existingDbCategory) {
          const mappedExistingCategory: Category = { // Explicitly map to Category
            id: existingDbCategory.id,
            name: existingDbCategory.name,
            organizationId: existingDbCategory.organization_id,
          };
          setCategories((prev) => Array.from(new Set([...prev, mappedExistingCategory].map(c => JSON.stringify(c)))).map(s => JSON.parse(s)));
          // REMOVED: addActivity("Category Add Concurrently", `Category "${trimmedName}" already exists, added concurrently.`, { categoryName: trimmedName });
          return mappedExistingCategory;
        }
      }
      console.error("Error adding category:", error);
      // REMOVED: addActivity("Category Add Failed", `Failed to add category: ${trimmedName}.`, { error: error.message, categoryName: trimmedName });
      showError(`Failed to add category: ${error.message}`);
      return null;
    } else if (data && data.length > 0) {
      const newCategory: Category = {
        id: data[0].id,
        name: data[0].name,
        organizationId: data[0].organization_id,
      };
      setCategories((prev) => [...prev, newCategory]);
      // REMOVED: addActivity("Category Added", `Added new category: ${newCategory.name}.`, { categoryId: newCategory.id, categoryName: newCategory.name });
      showSuccess(`Category "${trimmedName}" added.`);
      return newCategory;
    }
    return null;
  };

  const removeCategory = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("You must be logged in and have an organization ID to remove categories.");
      return;
    }

    const categoryToRemove = categories.find(cat => cat.id === id);

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("organization_id", profile.organizationId);

    if (error) {
      console.error("Error removing category:", error);
      // REMOVED: addActivity("Category Remove Failed", `Failed to remove category: ${categoryToRemove?.name || id}.`, { error: error.message, categoryId: id });
      showError(`Failed to remove category: ${error.message}`);
    } else {
      setCategories((prev) => prev.filter((cat) => cat.id !== id));
      // REMOVED: addActivity("Category Removed", `Removed category: ${categoryToRemove?.name || id}.`, { categoryId: id });
      showSuccess("Category removed.");
    }
  };

  const refreshCategories = async () => {
    await fetchCategories();
  };

  return (
    <CategoryContext.Provider value={{ categories, addCategory, removeCategory, refreshCategories }}>
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategories = () => {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error("useCategories must be used within a CategoryProvider");
  }
  return context;
};