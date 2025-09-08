"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Zap, AlertTriangle, BellRing, Package } from "lucide-react";
import { useAutomation, AutomationRule } from "@/context/AutomationContext";
import { showError, showSuccess } from "@/utils/toast";

interface AutomationRuleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ruleToEdit?: AutomationRule | null;
}

const AutomationRuleDialog: React.FC<AutomationRuleDialogProps> = ({ isOpen, onClose, ruleToEdit }) => {
  const { addRule, updateRule } = useAutomation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [triggerType, setTriggerType] = useState("ON_STOCK_LEVEL_CHANGE");
  const [conditionQuantity, setConditionQuantity] = useState(""); // For 'ON_STOCK_LEVEL_CHANGE'
  const [actionNotificationMessage, setActionNotificationMessage] = useState(""); // For 'SEND_NOTIFICATION'

  useEffect(() => {
    if (isOpen) {
      if (ruleToEdit) {
        setName(ruleToEdit.name);
        setDescription(ruleToEdit.description || "");
        setIsActive(ruleToEdit.isActive);
        setTriggerType(ruleToEdit.triggerType);
        // Populate specific fields based on rule type
        if (ruleToEdit.triggerType === "ON_STOCK_LEVEL_CHANGE" && ruleToEdit.conditionJson?.field === "quantity") {
          setConditionQuantity(String(ruleToEdit.conditionJson.value));
        } else {
          setConditionQuantity("");
        }
        if (ruleToEdit.actionJson?.type === "SEND_NOTIFICATION") {
          setActionNotificationMessage(ruleToEdit.actionJson.message);
        } else {
          setActionNotificationMessage("");
        }
      } else {
        // Reset form for new rule
        setName("");
        setDescription("");
        setIsActive(true);
        setTriggerType("ON_STOCK_LEVEL_CHANGE");
        setConditionQuantity("");
        setActionNotificationMessage("");
      }
    }
  }, [isOpen, ruleToEdit]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      showError("Rule Name is required.");
      return;
    }

    let conditionJson: any = null;
    let actionJson: any = null;

    // Build condition JSON based on trigger type
    if (triggerType === "ON_STOCK_LEVEL_CHANGE") {
      const quantity = parseInt(conditionQuantity);
      if (isNaN(quantity) || quantity < 0) {
        showError("Please enter a valid non-negative number for the stock level condition.");
        return;
      }
      conditionJson = {
        field: "quantity",
        operator: "lt", // less than
        value: quantity,
      };
    }

    // Build action JSON (only SEND_NOTIFICATION for now)
    if (!actionNotificationMessage.trim()) {
      showError("Notification message is required for the 'Send Notification' action.");
      return;
    }
    actionJson = {
      type: "SEND_NOTIFICATION",
      message: actionNotificationMessage.trim(),
    };

    const ruleData: Omit<AutomationRule, "id" | "organizationId" | "userId" | "createdAt"> = {
      name: name.trim(),
      description: description.trim() || undefined,
      isActive,
      triggerType,
      conditionJson,
      actionJson,
    };

    if (ruleToEdit) {
      await updateRule({ ...ruleData, id: ruleToEdit.id });
    } else {
      await addRule(ruleData);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" /> {ruleToEdit ? "Edit Automation Rule" : "Create New Automation Rule"}
          </DialogTitle>
          <DialogDescription>
            Define a trigger, condition, and action for your automation rule.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ruleName">Rule Name <span className="text-red-500">*</span></Label>
            <Input
              id="ruleName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Low Stock Alert for Electronics"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ruleDescription">Description (Optional)</Label>
            <Textarea
              id="ruleDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe what this rule does."
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between space-x-2 pt-2">
            <Label htmlFor="isActive">Enable Rule</Label>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {/* Trigger Definition */}
          <div className="space-y-2 border-t border-border pt-4 mt-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" /> Trigger (When...)
            </h3>
            <Label htmlFor="triggerType">Trigger Type <span className="text-red-500">*</span></Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger id="triggerType">
                <SelectValue placeholder="Select a trigger event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ON_STOCK_LEVEL_CHANGE">On Stock Level Change</SelectItem>
                {/* Future triggers would go here */}
              </SelectContent>
            </Select>
          </div>

          {/* Condition Definition (Dynamic based on trigger) */}
          <div className="space-y-2 border-t border-border pt-4 mt-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" /> Condition (If...)
            </h3>
            {triggerType === "ON_STOCK_LEVEL_CHANGE" && (
              <div className="space-y-2">
                <Label htmlFor="conditionQuantity">Product's total quantity drops below <span className="text-red-500">*</span></Label>
                <Input
                  id="conditionQuantity"
                  type="number"
                  value={conditionQuantity}
                  onChange={(e) => setConditionQuantity(e.target.value)}
                  placeholder="e.g., 5"
                  min="0"
                />
              </div>
            )}
            {/* Future conditions would go here */}
            {!triggerType && <p className="text-muted-foreground text-sm">Select a trigger to define conditions.</p>}
          </div>

          {/* Action Definition (Dynamic based on trigger/condition) */}
          <div className="space-y-2 border-t border-border pt-4 mt-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BellRing className="h-5 w-5 text-green-500" /> Action (Then...)
            </h3>
            <Label htmlFor="actionType">Action Type <span className="text-red-500">*</span></Label>
            <Select value="SEND_NOTIFICATION" onValueChange={() => { /* Only one action type for now */ }} disabled>
              <SelectTrigger id="actionType">
                <SelectValue placeholder="Select an action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SEND_NOTIFICATION">Send Notification</SelectItem>
                {/* Future actions would go here */}
              </SelectContent>
            </Select>
            <div className="space-y-2 mt-2">
              <Label htmlFor="notificationMessage">Notification Message <span className="text-red-500">*</span></Label>
              <Input
                id="notificationMessage"
                value={actionNotificationMessage}
                onChange={(e) => setActionNotificationMessage(e.target.value)}
                placeholder="e.g., Item {itemName} is critically low in stock!"
              />
              <p className="text-xs text-muted-foreground">
                Use <code>{`{itemName}`}</code> and <code>{`{sku}`}</code> as placeholders for dynamic values.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {ruleToEdit ? "Save Changes" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AutomationRuleDialog;