import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BellRing, PackageMinus, Info, CheckCircle, XCircle } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext"; // Import useNotifications
import { formatDistanceToNowStrict } from "date-fns";

interface NotificationSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const NotificationSheet: React.FC<NotificationSheetProps> = ({
  isOpen,
  onOpenChange,
}) => {
  const { notifications, markAllAsRead, clearAllNotifications, markNotificationAsRead } = useNotifications();

  const getIconForNotificationType = (type: string) => {
    switch (type) {
      case "warning":
        return <PackageMinus className="h-5 w-5 text-destructive mt-1" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500 mt-1" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500 mt-1" />;
      case "info":
      default:
        return <Info className="h-5 w-5 text-primary mt-1" />;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BellRing className="h-6 w-6 text-primary" /> Notifications
          </SheetTitle>
          <SheetDescription>Your recent alerts and updates.</SheetDescription>
        </SheetHeader>
        <div className="py-4 space-y-4">
          <div className="flex gap-2">
            <Button onClick={markAllAsRead} className="w-full" disabled={notifications.filter(n => !n.isRead).length === 0}>
              Mark all as read
            </Button>
            <Button variant="outline" onClick={clearAllNotifications} className="w-full" disabled={notifications.length === 0}>
              Clear all
            </Button>
          </div>

          {notifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No new notifications.</p>
          ) : (
            notifications.map((notif) => (
              <Card
                key={notif.id}
                className={`bg-card border-border shadow-sm ${!notif.isRead ? "border-l-4 border-primary" : ""}`}
                onClick={() => !notif.isRead && markNotificationAsRead(notif.id)}
              >
                <CardContent className="p-4 flex items-start space-x-3">
                  {getIconForNotificationType(notif.type)}
                  <div>
                    <h3 className="font-semibold text-foreground">{notif.message}</h3>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNowStrict(new Date(notif.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationSheet;