import React, { useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { mainNavItems, userAndSettingsNavItems, supportAndResourcesNavItems, NavItem } from "@/lib/navigation";
import { useNotifications } from "@/context/NotificationContext";
import { useProfile } from "@/context/ProfileContext";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { useOnboarding } from "@/context/OnboardingContext"; // NEW: Import useOnboarding

interface MobileDrawerContentProps {
  onLinkClick: () => void; // Callback to close the sheet after navigation
}

const MobileDrawerContent: React.FC<MobileDrawerContentProps> = ({ onLinkClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { profile } = useProfile();
  const { companyProfile } = useOnboarding(); // NEW: Get companyProfile

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' }); // Changed to perform a local logout
    if (error) {
      // If the error is specifically "Auth session missing", it means they are effectively logged out.
      // Treat it as a success for the user experience.
      if (error.message.includes("Auth session missing")) {
        showSuccess("Logged out successfully!");
      } else {
        showError("Failed to log out: " + error.message);
      }
    } else {
      showSuccess("Logged out successfully!");
    }
    // Call onLinkClick to close the drawer, but let App.tsx handle navigation.
    onLinkClick();
  };

  const handleNavigation = (path: string) => {
    onLinkClick(); // Close the sheet immediately
    navigate(path);
  };

  const baseButtonClass = "justify-start text-base font-medium transition-colors hover:text-primary w-full";
  const activeLinkClass = "text-primary bg-muted";
  const inactiveLinkClass = "text-muted-foreground";

  const renderNavItems = useCallback((items: NavItem[], isSubItem = false) => (
    <div className={cn("space-y-1", isSubItem && "ml-4 border-l border-muted/30 pl-2")}>
      {items.map((item) => {
        // Refined logic for active link detection
        const currentIsActive = item.href === "/"
          ? location.pathname === "/"
          : location.pathname.startsWith(item.href);

        if (item.adminOnly && profile?.role !== 'admin') {
          return null;
        }

        if (item.isParent && item.children) {
          return (
            <Accordion type="single" collapsible key={item.title} className="w-full">
              <AccordionItem value={item.title} className="border-none">
                <AccordionTrigger className={cn(
                  baseButtonClass,
                  "py-2 px-3 flex items-center justify-between",
                  currentIsActive ? activeLinkClass : inactiveLinkClass,
                  "hover:no-underline"
                )}>
                  <div className="flex items-center">
                    <item.icon className="h-5 w-5 mr-3" />
                    <span className="truncate">{item.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-1">
                  {renderNavItems(item.children, true)}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          );
        }

        return (
          <Button
            key={item.title}
            variant="ghost"
            className={cn(
              baseButtonClass,
              currentIsActive ? activeLinkClass : inactiveLinkClass,
            )}
            onClick={() => {
              if (item.action) {
                item.action();
              } else {
                handleNavigation(item.href);
              }
            }}
          >
            <item.icon className="h-5 w-5 mr-3" />
            <span className="truncate">{item.title}</span>
            {item.title === "Notifications" && unreadCount > 0 && (
              <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  ), [location.pathname, navigate, onLinkClick, unreadCount, profile]); // Dependencies for useCallback

  return (
    <ScrollArea className="flex-grow py-4">
      <nav className="flex flex-col space-y-4">
        {renderNavItems(mainNavItems)}

        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
          User & Account
        </div>
        {renderNavItems(userAndSettingsNavItems)}

        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
          Support & Resources
        </div>
        {renderNavItems(supportAndResourcesNavItems)}

        <div className="mt-auto pt-4 border-t border-border">
          <Button
            variant="ghost"
            className={cn(baseButtonClass, "text-destructive focus:bg-destructive/10")}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" /> Logout
          </Button>
        </div>
      </nav>
    </ScrollArea>
  );
};

export default MobileDrawerContent;