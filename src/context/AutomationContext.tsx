"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { useProfile } from "./ProfileContext";
import { parseAndValidateDate } from "@/utils/dateUtils"; // Import parseAndValidateDate

export interface AutomationRule {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: string; // e.g., 'ON_STOCK_LEVEL_CHANGE'
  conditionJson: any; // JSON object for conditions
  actionJson: any; // JSON object for actions
  createdAt: string;
}

interface AutomationContextType {
  automationRules: AutomationRule[];
  isLoadingRules: boolean;
  addRule: (rule: Omit<AutomationRule, "id" | "organizationId" | "userId" | "createdAt">) => Promise<void>;
  updateRule: (updatedRule: Omit<AutomationRule, "organizationId" | "userId" | "createdAt">) => Promise<void>;
  deleteRule: (ruleId: string) => Promise<void>;
  refreshRules: () => Promise<void>;
}

const AutomationContext = createContext<AutomationContextType | undefined>(undefined);

export const AutomationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(true);
  const { profile, isLoadingProfile } = useProfile();

  const mapSupabaseRuleToAutomationRule = (rule: any): AutomationRule => {
    const validatedCreatedAt = parseAndValidateDate(rule.created_at);
    const createdAtString = validatedCreatedAt ? validatedCreatedAt.toISOString() : new Date().toISOString();

    return {
      id: rule.id,
      organizationId: rule.organization_id,
      userId: rule.user_id,
      name: rule.name,
      description: rule.description || undefined,
      isActive: rule.is_active,
      triggerType: rule.trigger_type,
      conditionJson: rule.condition_json,
      actionJson: rule.action_json,
      createdAt: createdAtString,
    };
  };

  const fetchAutomationRules = useCallback(async () => {
    setIsLoadingRules(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !profile?.organizationId) {
      setAutomationRules([]);
      setIsLoadingRules(false);
      return;
    }

    const { data, error } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching automation rules:", error);
      showError("Failed to load automation rules.");
      setAutomationRules([]);
    } else {
      const fetchedRules: AutomationRule[] = data.map(mapSupabaseRuleToAutomationRule);
      setAutomationRules(fetchedRules);
    }
    setIsLoadingRules(false);
  }, [profile?.organizationId]);

  useEffect(() => {
    if (!isLoadingProfile && profile?.organizationId) {
      fetchAutomationRules();
    } else if (!isLoadingProfile && !profile?.organizationId) {
      setAutomationRules([]);
      setIsLoadingRules(false);
    }
  }, [fetchAutomationRules, isLoadingProfile, profile?.organizationId]);

  // Realtime subscription for automation rules
  useEffect(() => {
    if (!profile?.organizationId) return;

    console.log(`[AutomationContext] Subscribing to real-time changes for automation_rules in organization: ${profile.organizationId}`);

    const channel = supabase
      .channel(`automation_rules_org_${profile.organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'automation_rules',
          filter: `organization_id=eq.${profile.organizationId}`,
        },
        (payload) => {
          console.log('[AutomationContext] Realtime change received:', payload);
          setAutomationRules(prevRules => {
            const newRule = mapSupabaseRuleToAutomationRule(payload.new || payload.old);
            switch (payload.eventType) {
              case 'INSERT':
                if (!prevRules.some(rule => rule.id === newRule.id)) {
                  return [newRule, ...prevRules]; // Add new rule to the top
                }
                return prevRules;
              case 'UPDATE':
                return prevRules.map(rule => rule.id === newRule.id ? newRule : rule);
              case 'DELETE':
                return prevRules.filter(rule => rule.id !== newRule.id);
              default:
                return prevRules;
            }
          });
        }
      )
      .subscribe();

    return () => {
      console.log(`[AutomationContext] Unsubscribing from real-time changes for automation_rules in organization: ${profile.organizationId}`);
      supabase.removeChannel(channel);
    };
  }, [profile?.organizationId]);

  const addRule = async (rule: Omit<AutomationRule, "id" | "organizationId" | "userId" | "createdAt">) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("You must be logged in and have an organization ID to add automation rules.");
      return;
    }

    const { data, error } = await supabase
      .from("automation_rules")
      .insert({
        organization_id: profile.organizationId,
        user_id: session.user.id,
        name: rule.name,
        description: rule.description,
        is_active: rule.isActive,
        trigger_type: rule.triggerType,
        condition_json: rule.conditionJson,
        action_json: rule.actionJson,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding automation rule:", error);
      showError(`Failed to add rule: ${error.message}`);
    } else if (data) {
      showSuccess(`Automation rule "${rule.name}" added successfully!`);
      // Realtime subscription will update the state
    }
  };

  const updateRule = async (updatedRule: Omit<AutomationRule, "organizationId" | "userId" | "createdAt">) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("You must be logged in and have an organization ID to update automation rules.");
      return;
    }

    const { data, error } = await supabase
      .from("automation_rules")
      .update({
        name: updatedRule.name,
        description: updatedRule.description,
        is_active: updatedRule.isActive,
        trigger_type: updatedRule.triggerType,
        condition_json: updatedRule.conditionJson,
        action_json: updatedRule.actionJson,
      })
      .eq("id", updatedRule.id)
      .eq("organization_id", profile.organizationId)
      .select()
      .single();

    if (error) {
      console.error("Error updating automation rule:", error);
      showError(`Failed to update rule: ${error.message}`);
    } else if (data) {
      showSuccess(`Automation rule "${updatedRule.name}" updated successfully!`);
      // Realtime subscription will update the state
    }
  };

  const deleteRule = async (ruleId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("You must be logged in and have an organization ID to delete automation rules.");
      return;
    }

    const ruleToDelete = automationRules.find(r => r.id === ruleId);

    const { error } = await supabase
      .from("automation_rules")
      .delete()
      .eq("id", ruleId)
      .eq("organization_id", profile.organizationId);

    if (error) {
      console.error("Error deleting automation rule:", error);
      showError(`Failed to delete rule: ${error.message}`);
    } else {
      showSuccess(`Automation rule "${ruleToDelete?.name || ruleId}" deleted.`);
      // Realtime subscription will update the state
    }
  };

  const refreshRules = async () => {
    await fetchAutomationRules();
  };

  return (
    <AutomationContext.Provider value={{ automationRules, isLoadingRules, addRule, updateRule, deleteRule, refreshRules }}>
      {children}
    </AutomationContext.Provider>
  );
};

export const useAutomation = () => {
  const context = useContext(AutomationContext);
  if (context === undefined) {
    throw new Error("useAutomation must be used within an AutomationProvider");
  }
  return context;
};