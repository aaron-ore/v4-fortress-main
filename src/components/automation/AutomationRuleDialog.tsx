"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { Zap, AlertTriangle, BellRing, Package, Receipt, UserRound, MapPin, DollarSign, Repeat } from "lucide-react";
import { useAutomation, AutomationRule } from "@/context/AutomationContext";
import { showError, showSuccess } from "@/utils/toast";
import { useInventory } from "@/context/InventoryContext"; // NEW: Import InventoryContext
import { useOrders } from "@/context/OrdersContext"; // NEW: Import OrdersContext
import { useCategories } from "@/context/CategoryContext"; // NEW: Import CategoryContext
import { useOnboarding } from "@/context/OnboardingContext"; // NEW: Import OnboardingContext
import { useVendors } from "@/context/VendorContext"; // NEW: Import VendorContext
import { useCustomers } from "@/context/CustomerContext"; // NEW: Import CustomerContext

interface AutomationRuleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ruleToEdit?: AutomationRule | null;
}

const AutomationRuleDialog: React.FC<AutomationRuleDialogProps> = ({ isOpen, onClose, ruleToEdit }) => {
  const { addRule, updateRule } = useAutomation();
  const { inventoryItems } = useInventory(); // For item selection in conditions/actions
  const { orders } = useOrders(); // For order selection in conditions/actions
  const { categories } = useCategories(); // For category selection in conditions
  const { locations } = useOnboarding(); // For location selection in conditions
  const { vendors } = useVendors(); // For vendor selection in actions
  const { customers } = useCustomers(); // For customer selection in conditions

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [triggerType, setTriggerType] = useState<AutomationRule['triggerType']>("ON_STOCK_LEVEL_CHANGE");

  // Condition states (dynamic based on triggerType)
  const [conditionField, setConditionField] = useState(""); // e.g., 'quantity', 'status', 'category'
  const [conditionOperator, setConditionOperator] = useState(""); // e.g., 'lt', 'eq', 'gt'
  const [conditionValue, setConditionValue] = useState(""); // number or string
  const [conditionOldStatus, setConditionOldStatus] = useState(""); // For ON_ORDER_STATUS_CHANGE
  const [conditionNewStatus, setConditionNewStatus] = useState(""); // For ON_ORDER_STATUS_CHANGE
  const [conditionOrderType, setConditionOrderType] = useState(""); // For ON_ORDER_STATUS_CHANGE

  // Action states (dynamic based on actionType)
  const [actionType, setActionType] = useState("SEND_NOTIFICATION");
  const [actionNotificationMessage, setActionNotificationMessage] = useState("");
  const [actionEmailTo, setActionEmailTo] = useState(""); // 'admin', 'manager', 'email@example.com'
  const [actionEmailSubject, setActionEmailSubject] = useState("");
  const [actionEmailBody, setActionEmailBody] = useState("");
  const [actionCreatePoItemId, setActionCreatePoItemId] = useState("");
  const [actionCreatePoQuantity, setActionCreatePoQuantity] = useState("");

  const orderStatuses = useMemo(() => ["New Order", "Processing", "Packed", "Shipped", "On Hold / Problem", "Archived"], []);
  const orderTypes = useMemo(() => ["Sales", "Purchase"], []);

  useEffect(() => {
    if (isOpen) {
      if (ruleToEdit) {
        setName(ruleToEdit.name);
        setDescription(ruleToEdit.description || "");
        setIsActive(ruleToEdit.isActive);
        setTriggerType(ruleToEdit.triggerType);

        // Populate condition states
        if (ruleToEdit.triggerType === "ON_STOCK_LEVEL_CHANGE") {
          setConditionField(ruleToEdit.conditionJson?.field || "");
          setConditionOperator(ruleToEdit.conditionJson?.operator || "");
          setConditionValue(String(ruleToEdit.conditionJson?.value || ""));
        } else if (ruleToEdit.triggerType === "ON_ORDER_STATUS_CHANGE") {
          setConditionOrderType(ruleToEdit.conditionJson?.orderType || "");
          setConditionOldStatus(ruleToEdit.conditionJson?.oldStatus || "");
          setConditionNewStatus(ruleToEdit.conditionJson?.newStatus || "");
        } else if (ruleToEdit.triggerType === "ON_NEW_INVENTORY_ITEM") {
          setConditionField(ruleToEdit.conditionJson?.field || "");
          setConditionOperator(ruleToEdit.conditionJson?.operator || "");
          setConditionValue(String(ruleToEdit.conditionJson?.value || ""));
        } else {
          setConditionField("");
          setConditionOperator("");
          setConditionValue("");
          setConditionOldStatus("");
          setConditionNewStatus("");
          setConditionOrderType("");
        }

        // Populate action states
        if (ruleToEdit.actionJson?.type === "SEND_NOTIFICATION") {
          setActionType("SEND_NOTIFICATION");
          setActionNotificationMessage(ruleToEdit.actionJson.message);
        } else if (ruleToEdit.actionJson?.type === "SEND_EMAIL") {
          setActionType("SEND_EMAIL");
          setActionEmailTo(ruleToEdit.actionJson.to);
          setActionEmailSubject(ruleToEdit.actionJson.subject);
          setActionEmailBody(ruleToEdit.actionJson.body);
        } else if (ruleToEdit.actionJson?.type === "CREATE_PURCHASE_ORDER") {
          setActionType("CREATE_PURCHASE_ORDER");
          setActionCreatePoItemId(ruleToEdit.actionJson.itemId);
          setActionCreatePoQuantity(String(ruleToEdit.actionJson.quantity));
        } else {
          setActionType("SEND_NOTIFICATION");
          setActionNotificationMessage("");
          setActionEmailTo("");
          setActionEmailSubject("");
          setActionEmailBody("");
          setActionCreatePoItemId("");
          setActionCreatePoQuantity("");
        }
      } else {
        // Reset form for new rule
        setName("");
        setDescription("");
        setIsActive(true);
        setTriggerType("ON_STOCK_LEVEL_CHANGE");
        setConditionField("");
        setConditionOperator("");
        setConditionValue("");
        setConditionOldStatus("");
        setConditionNewStatus("");
        setConditionOrderType("");
        setActionType("SEND_NOTIFICATION");
        setActionNotificationMessage("");
        setActionEmailTo("");
        setActionEmailSubject("");
        setActionEmailBody("");
        setActionCreatePoItemId("");
        setActionCreatePoQuantity("");
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

    // --- Build Condition JSON based on trigger type ---
    if (triggerType === "ON_STOCK_LEVEL_CHANGE") {
      if (!conditionField || !conditionOperator || !conditionValue) {
        showError("Please define a complete condition for Stock Level Change.");
        return;
      }
      conditionJson = {
        field: conditionField,
        operator: conditionOperator,
        value: ["quantity", "unitCost", "retailPrice"].includes(conditionField) ? parseFloat(conditionValue) : conditionValue,
      };
    } else if (triggerType === "ON_ORDER_STATUS_CHANGE") {
      if (!conditionOrderType || !conditionNewStatus) {
        showError("Please define order type and new status for Order Status Change condition.");
        return;
      }
      conditionJson = {
        orderType: conditionOrderType,
        oldStatus: conditionOldStatus || "any", // 'any' means it doesn't matter what the old status was
        newStatus: conditionNewStatus,
      };
    } else if (triggerType === "ON_NEW_INVENTORY_ITEM") {
      if (!conditionField || !conditionOperator || !conditionValue) {
        showError("Please define a complete condition for New Inventory Item.");
        return;
      }
      conditionJson = {
        field: conditionField,
        operator: conditionOperator,
        value: ["unitCost", "retailPrice"].includes(conditionField) ? parseFloat(conditionValue) : conditionValue,
      };
    }
    // Add other trigger conditions here

    // --- Build Action JSON based on action type ---
    if (actionType === "SEND_NOTIFICATION") {
      if (!actionNotificationMessage.trim()) {
        showError("Notification message is required for the 'Send Notification' action.");
        return;
      }
      actionJson = {
        type: "SEND_NOTIFICATION",
        message: actionNotificationMessage.trim(),
      };
    } else if (actionType === "SEND_EMAIL") {
      if (!actionEmailTo || !actionEmailSubject.trim() || !actionEmailBody.trim()) {
        showError("Email recipient, subject, and body are required for the 'Send Email' action.");
        return;
      }
      actionJson = {
        type: "SEND_EMAIL",
        to: actionEmailTo,
        subject: actionEmailSubject.trim(),
        body: actionEmailBody.trim(),
      };
    } else if (actionType === "CREATE_PURCHASE_ORDER") {
      const quantity = parseInt(actionCreatePoQuantity);
      if (!actionCreatePoItemId || isNaN(quantity) || quantity <= 0) {
        showError("Please select an item and enter a valid positive quantity for the 'Create Purchase Order' action.");
        return;
      }
      actionJson = {
        type: "CREATE_PURCHASE_ORDER",
        itemId: actionCreatePoItemId,
        quantity: quantity,
      };
    }
    // Add other action types here

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

  const renderConditionFields = () => {
    switch (triggerType) {
      case "ON_STOCK_LEVEL_CHANGE":
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="conditionField">Field</Label>
                <Select value={conditionField} onValueChange={setConditionField}>
                  <SelectTrigger id="conditionField"><SelectValue placeholder="Select field" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quantity">Total Quantity</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="conditionOperator">Operator</Label>
                <Select value={conditionOperator} onValueChange={setConditionOperator}>
                  <SelectTrigger id="conditionOperator"><SelectValue placeholder="Select operator" /></SelectTrigger>
                  <SelectContent>
                    {["quantity", "unitCost", "retailPrice"].includes(conditionField) && (
                      <>
                        <SelectItem value="lt">Less than (&lt;)</SelectItem>
                        <SelectItem value="eq">Equals (=)</SelectItem>
                        <SelectItem value="gt">Greater than (&gt;)</SelectItem>
                      </>
                    )}
                    {["status", "category", "location"].includes(conditionField) && (
                      <SelectItem value="eq">Equals (=)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {conditionField && conditionOperator && (
              <div className="space-y-2">
                <Label htmlFor="conditionValue">Value</Label>
                {["quantity", "unitCost", "retailPrice"].includes(conditionField) ? (
                  <Input
                    id="conditionValue"
                    type="number"
                    value={conditionValue}
                    onChange={(e) => setConditionValue(e.target.value)}
                    placeholder="e.g., 10"
                    min="0"
                    step={["unitCost", "retailPrice"].includes(conditionField) ? "0.01" : "1"}
                  />
                ) : conditionField === "status" ? (
                  <Select value={conditionValue} onValueChange={setConditionValue}>
                    <SelectTrigger id="conditionValue"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="In Stock">In Stock</SelectItem>
                      <SelectItem value="Low Stock">Low Stock</SelectItem>
                      <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                ) : conditionField === "category" ? (
                  <Select value={conditionValue} onValueChange={setConditionValue}>
                    <SelectTrigger id="conditionValue"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : conditionField === "location" ? (
                  <Select value={conditionValue} onValueChange={setConditionValue}>
                    <SelectTrigger id="conditionValue"><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>
                      {locations.map(loc => <SelectItem key={loc.id} value={loc.fullLocationString}>{loc.displayName || loc.fullLocationString}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
            )}
          </>
        );
      case "ON_ORDER_STATUS_CHANGE":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="conditionOrderType">Order Type</Label>
              <Select value={conditionOrderType} onValueChange={setConditionOrderType}>
                <SelectTrigger id="conditionOrderType"><SelectValue placeholder="Select order type" /></SelectTrigger>
                <SelectContent>
                  {orderTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="conditionOldStatus">From Status (Optional)</Label>
                <Select value={conditionOldStatus} onValueChange={setConditionOldStatus}>
                  <SelectTrigger id="conditionOldStatus"><SelectValue placeholder="Any status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Status</SelectItem>
                    {orderStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="conditionNewStatus">To Status</Label>
                <Select value={conditionNewStatus} onValueChange={setConditionNewStatus}>
                  <SelectTrigger id="conditionNewStatus"><SelectValue placeholder="Select new status" /></SelectTrigger>
                  <SelectContent>
                    {orderStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        );
      case "ON_NEW_INVENTORY_ITEM":
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="conditionField">Field</Label>
                <Select value={conditionField} onValueChange={setConditionField}>
                  <SelectTrigger id="conditionField"><SelectValue placeholder="Select field" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="unitCost">Unit Cost</SelectItem>
                    <SelectItem value="retailPrice">Retail Price</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="conditionOperator">Operator</Label>
                <Select value={conditionOperator} onValueChange={setConditionOperator}>
                  <SelectTrigger id="conditionOperator"><SelectValue placeholder="Select operator" /></SelectTrigger>
                  <SelectContent>
                    {["unitCost", "retailPrice"].includes(conditionField) && (
                      <>
                        <SelectItem value="lt">Less than (&lt;)</SelectItem>
                        <SelectItem value="eq">Equals (=)</SelectItem>
                        <SelectItem value="gt">Greater than (&gt;)</SelectItem>
                      </>
                    )}
                    {conditionField === "category" && (
                      <SelectItem value="eq">Equals (=)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {conditionField && conditionOperator && (
              <div className="space-y-2">
                <Label htmlFor="conditionValue">Value</Label>
                {["unitCost", "retailPrice"].includes(conditionField) ? (
                  <Input
                    id="conditionValue"
                    type="number"
                    value={conditionValue}
                    onChange={(e) => setConditionValue(e.target.value)}
                    placeholder="e.g., 50.00"
                    min="0"
                    step="0.01"
                  />
                ) : conditionField === "category" ? (
                  <Select value={conditionValue} onValueChange={setConditionValue}>
                    <SelectTrigger id="conditionValue"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
            )}
          </>
        );
      // Add other trigger condition renderings here
      default:
        return <p className="text-muted-foreground text-sm">Select a trigger to define conditions.</p>;
    }
  };

  const renderActionFields = () => {
    switch (actionType) {
      case "SEND_NOTIFICATION":
        return (
          <div className="space-y-2">
            <Label htmlFor="notificationMessage">Notification Message <span className="text-red-500">*</span></Label>
            <Input
              id="notificationMessage"
              value={actionNotificationMessage}
              onChange={(e) => setActionNotificationMessage(e.target.value)}
              placeholder="e.g., Item {itemName} is critically low in stock!"
            />
            <p className="text-xs text-muted-foreground">
              Use <code>{`{itemName}`}</code>, <code>{`{sku}`}</code>, <code>{`{quantity}`}</code>, <code>{`{oldStatus}`}</code>, <code>{`{newStatus}`}</code> as placeholders.
            </p>
          </div>
        );
      case "SEND_EMAIL":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="actionEmailTo">Recipient <span className="text-red-500">*</span></Label>
              <Select value={actionEmailTo} onValueChange={setActionEmailTo}>
                <SelectTrigger id="actionEmailTo"><SelectValue placeholder="Select recipient" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Organization Admin</SelectItem>
                  <SelectItem value="manager">Inventory Managers</SelectItem>
                  <SelectItem value="custom">Custom Email Address</SelectItem>
                </SelectContent>
              </Select>
              {actionEmailTo === "custom" && (
                <Input
                  type="email"
                  value={actionEmailTo.includes('@') ? actionEmailTo : ''} // Clear if not a valid email
                  onChange={(e) => setActionEmailTo(e.target.value)}
                  placeholder="e.g., alerts@yourcompany.com"
                  className="mt-2"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="actionEmailSubject">Subject <span className="text-red-500">*</span></Label>
              <Input
                id="actionEmailSubject"
                value={actionEmailSubject}
                onChange={(e) => setActionEmailSubject(e.target.value)}
                placeholder="e.g., Low Stock Alert: {itemName}"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actionEmailBody">Body <span className="text-red-500">*</span></Label>
              <Textarea
                id="actionEmailBody"
                value={actionEmailBody}
                onChange={(e) => setActionEmailBody(e.target.value)}
                placeholder="e.g., Dear team, item {itemName} (SKU: {sku}) is now at {quantity} units."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Use <code>{`{itemName}`}</code>, <code>{`{sku}`}</code>, <code>{`{quantity}`}</code>, <code>{`{oldStatus}`}</code>, <code>{`{newStatus}`}</code> as placeholders.
              </p>
            </div>
          </>
        );
      case "CREATE_PURCHASE_ORDER":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="actionCreatePoItemId">Item to Order <span className="text-red-500">*</span></Label>
              <Select value={actionCreatePoItemId} onValueChange={setActionCreatePoItemId}>
                <SelectTrigger id="actionCreatePoItemId"><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>
                  {inventoryItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} (SKU: {item.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="actionCreatePoQuantity">Quantity <span className="text-red-500">*</span></Label>
              <Input
                id="actionCreatePoQuantity"
                type="number"
                value={actionCreatePoQuantity}
                onChange={(e) => setActionCreatePoQuantity(e.target.value)}
                placeholder="e.g., 100"
                min="1"
              />
            </div>
          </>
        );
      // Add other action renderings here
      default:
        return <p className="text-muted-foreground text-sm">Select an action type.</p>;
    }
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
            <Select value={triggerType} onValueChange={(value: AutomationRule['triggerType']) => setTriggerType(value)}>
              <SelectTrigger id="triggerType"><SelectValue placeholder="Select a trigger event" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ON_STOCK_LEVEL_CHANGE">On Stock Level Change</SelectItem>
                <SelectItem value="ON_ORDER_STATUS_CHANGE">On Order Status Change</SelectItem>
                <SelectItem value="ON_NEW_INVENTORY_ITEM">On New Inventory Item</SelectItem>
                {/* Add other trigger types here */}
              </SelectContent>
            </Select>
          </div>

          {/* Condition Definition (Dynamic based on trigger) */}
          <div className="space-y-2 border-t border-border pt-4 mt-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" /> Condition (If...)
            </h3>
            {renderConditionFields()}
          </div>

          {/* Action Definition (Dynamic based on action type) */}
          <div className="space-y-2 border-t border-border pt-4 mt-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BellRing className="h-5 w-5 text-green-500" /> Action (Then...)
            </h3>
            <Label htmlFor="actionType">Action Type <span className="text-red-500">*</span></Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger id="actionType"><SelectValue placeholder="Select an action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SEND_NOTIFICATION">Send In-App Notification</SelectItem>
                <SelectItem value="SEND_EMAIL">Send Email</SelectItem>
                <SelectItem value="CREATE_PURCHASE_ORDER">Create Purchase Order</SelectItem>
                {/* Add other action types here */}
              </SelectContent>
            </Select>
            {renderActionFields()}
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