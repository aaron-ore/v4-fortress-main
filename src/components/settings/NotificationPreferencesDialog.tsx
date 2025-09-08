import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BellRing, Mail, Smartphone } from "lucide-react";
import { showSuccess } from "@/utils/toast";

interface NotificationPreferencesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationPreferencesDialog: React.FC<NotificationPreferencesDialogProps> = ({ isOpen, onClose }) => {
  const [lowStockEmail, setLowStockEmail] = React.useState(true);
  const [lowStockSms, setLowStockSms] = React.useState(false);
  const [newOrderEmail, setNewOrderEmail] = React.useState(true);
  const [newOrderSms, setNewOrderSms] = React.useState(true);
  const [shipmentUpdateEmail, setShipmentUpdateEmail] = React.useState(false);

  const handleSavePreferences = () => {
    showSuccess("Notification preferences saved!");
    // In a real app, you'd send these settings to a backend
    console.log({
      lowStockEmail,
      lowStockSms,
      newOrderEmail,
      newOrderSms,
      shipmentUpdateEmail,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="h-6 w-6 text-primary" /> Notification Preferences
          </DialogTitle>
          <DialogDescription>
            Customize how and when you receive alerts from Fortress.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Low Stock Alerts</h3>
            <div className="flex items-center justify-between">
              <Label htmlFor="low-stock-email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" /> Email Notifications
              </Label>
              <Switch
                id="low-stock-email"
                checked={lowStockEmail}
                onCheckedChange={setLowStockEmail}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="low-stock-sms" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" /> SMS Notifications
              </Label>
              <Switch
                id="low-stock-sms"
                checked={lowStockSms}
                onCheckedChange={setLowStockSms}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">New Order Alerts</h3>
            <div className="flex items-center justify-between">
              <Label htmlFor="new-order-email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" /> Email Notifications
              </Label>
              <Switch
                id="new-order-email"
                checked={newOrderEmail}
                onCheckedChange={setNewOrderEmail}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="new-order-sms" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" /> SMS Notifications
              </Label>
              <Switch
                id="new-order-sms"
                checked={newOrderSms}
                onCheckedChange={setNewOrderSms}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Shipment Updates</h3>
            <div className="flex items-center justify-between">
              <Label htmlFor="shipment-update-email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" /> Email Notifications
              </Label>
              <Switch
                id="shipment-update-email"
                checked={shipmentUpdateEmail}
                onCheckedChange={setShipmentUpdateEmail}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSavePreferences}>Save Preferences</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationPreferencesDialog;