import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BellRing, PackageMinus, Info, CheckCircle, XCircle } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";
import { formatDistanceToNowStrict } from "date-fns";

const NotificationsPage: React.FC = () => {
  const { notifications, markAllAsRead, clearAllNotifications, markNotificationAsRead } = useNotifications();

  const unreadNotifications = useMemo(() => notifications.filter(n => !n.isRead), [notifications]);
  const readNotifications = useMemo(() => notifications.filter(n => n.isRead), [notifications]);

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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Notifications</h1>
      <p className="text-muted-foreground">Manage all your application alerts and updates.</p>

      <div className="flex gap-2">
        <Button onClick={markAllAsRead} disabled={unreadNotifications.length === 0}>
          Mark all as read
        </Button>
        <Button variant="outline" onClick={clearAllNotifications} disabled={notifications.length === 0}>
          Clear all
        </Button>
      </div>

      <Card className="bg-card border-border rounded-lg shadow-sm p-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">Unread Notifications ({unreadNotifications.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {unreadNotifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No unread notifications.</p>
          ) : (
            unreadNotifications.map((notif) => (
              <Card
                key={notif.id}
                className="bg-card border-l-4 border-primary shadow-sm cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => markNotificationAsRead(notif.id)}
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
        </CardContent>
      </Card>

      <Card className="bg-card border-border rounded-lg shadow-sm p-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">Read Notifications ({readNotifications.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {readNotifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No read notifications.</p>
          ) : (
            readNotifications.map((notif) => (
              <Card
                key={notif.id}
                className="bg-card border-border shadow-sm"
              >
                <CardContent className="p-4 flex items-start space-x-3">
                  {getIconForNotificationType(notif.type)}
                  <div>
                    <h3 className="font-semibold text-muted-foreground">{notif.message}</h3>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNowStrict(new Date(notif.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage;