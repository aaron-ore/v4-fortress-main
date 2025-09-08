"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, Edit, Trash2, Zap, ToggleRight, ToggleLeft, Loader2 } from "lucide-react";
import { useAutomation, AutomationRule } from "@/context/AutomationContext";
import { useProfile } from "@/context/ProfileContext";
import ConfirmDialog from "@/components/ConfirmDialog";
import AutomationRuleDialog from "@/components/automation/AutomationRuleDialog"; // NEW: Import AutomationRuleDialog
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

const Automation: React.FC = () => {
  const { automationRules, isLoadingRules, updateRule, deleteRule } = useAutomation();
  const { profile, isLoadingProfile } = useProfile();

  const [isAutomationRuleDialogOpen, setIsAutomationRuleDialogOpen] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState<AutomationRule | null>(null);

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<AutomationRule | null>(null);

  const isAdmin = profile?.role === 'admin';

  const handleCreateRuleClick = () => {
    setRuleToEdit(null); // Clear for new rule
    setIsAutomationRuleDialogOpen(true);
  };

  const handleEditRuleClick = (rule: AutomationRule) => {
    setRuleToEdit(rule);
    setIsAutomationRuleDialogOpen(true);
  };

  const handleDeleteRuleClick = (rule: AutomationRule) => {
    setRuleToDelete(rule);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteRule = async () => {
    if (ruleToDelete) {
      await deleteRule(ruleToDelete.id);
    }
    setIsConfirmDeleteDialogOpen(false);
    setRuleToDelete(null);
  };

  const handleToggleRuleActive = async (rule: AutomationRule, newActiveState: boolean) => {
    await updateRule({ ...rule, isActive: newActiveState });
  };

  const getTriggerDescription = (rule: AutomationRule) => {
    switch (rule.triggerType) {
      case "ON_STOCK_LEVEL_CHANGE":
        return "On Stock Level Change";
      case "ON_ORDER_STATUS_CHANGE":
        return "On Order Status Change";
      case "ON_NEW_DATA_ENTRY":
        return "On New Data Entry";
      case "ON_SCHEDULED_BASIS":
        return "On a Scheduled Basis";
      default:
        return rule.triggerType;
    }
  };

  const getConditionSummary = (rule: AutomationRule) => {
    if (!rule.conditionJson) return "No specific conditions";
    // For this phase, we only support simple quantity condition
    if (rule.triggerType === "ON_STOCK_LEVEL_CHANGE" && rule.conditionJson.field === "quantity" && rule.conditionJson.operator === "lt") {
      return `Quantity drops below ${rule.conditionJson.value}`;
    }
    return JSON.stringify(rule.conditionJson);
  };

  const getActionSummary = (rule: AutomationRule) => {
    if (!rule.actionJson) return "No specific action";
    // For this phase, we only support send notification action
    if (rule.actionJson.type === "SEND_NOTIFICATION") {
      return `Send Notification: "${rule.actionJson.message}"`;
    }
    return JSON.stringify(rule.actionJson);
  };

  if (isLoadingProfile || isLoadingRules) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading automation rules...</span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border">
          <CardTitle className="text-2xl font-bold mb-4">Access Denied</CardTitle>
          <CardContent>
            <p className="text-muted-foreground">You do not have administrative privileges to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Automation Engine</h1>
      <p className="text-muted-foreground">
        Automate repetitive tasks and streamline your inventory workflows with custom rules.
      </p>

      <Card className="bg-card border-border rounded-lg shadow-sm p-6">
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" /> Automation Rules
          </CardTitle>
          <Button onClick={handleCreateRuleClick}>
            <PlusCircle className="h-4 w-4 mr-2" /> Create New Rule
          </Button>
        </CardHeader>
        <CardContent>
          {automationRules.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No automation rules defined yet. Create your first rule!</p>
          ) : (
            <ScrollArea className="h-[500px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Active</TableHead>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="text-center w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {automationRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={(checked) => handleToggleRuleActive(rule, checked)}
                          aria-label={`Toggle rule ${rule.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>{getTriggerDescription(rule)}</TableCell>
                      <TableCell>{getConditionSummary(rule)}</TableCell>
                      <TableCell>{getActionSummary(rule)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditRuleClick(rule)}>
                            <Edit className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteRuleClick(rule)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <AutomationRuleDialog
        isOpen={isAutomationRuleDialogOpen}
        onClose={() => setIsAutomationRuleDialogOpen(false)}
        ruleToEdit={ruleToEdit}
      />

      {ruleToDelete && (
        <ConfirmDialog
          isOpen={isConfirmDeleteDialogOpen}
          onClose={() => setIsConfirmDeleteDialogOpen(false)}
          onConfirm={confirmDeleteRule}
          title="Confirm Rule Deletion"
          description={`Are you sure you want to delete the automation rule "${ruleToDelete.name}"? This action cannot be undone.`}
          confirmText="Delete Rule"
          cancelText="Cancel"
        />
      )}
    </div>
  );
};

export default Automation;