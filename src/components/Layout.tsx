import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
// REMOVED: import { MadeWithDyad } from "./made-with-dyad";
import AnnouncementBar from "./AnnouncementBar";
import Sidebar from "./Sidebar"; // Import the new Sidebar
import { useIsMobile } from "@/hooks/use-mobile";
import NotificationSheet from "./NotificationSheet";
import GlobalSearchDialog from "./GlobalSearchDialog";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext"; // NEW: Import useSidebar
import FeedbackDialog from "./FeedbackDialog"; // NEW: Import FeedbackDialog

const Layout: React.FC = () => {
  const isMobile = useIsMobile();
  const [isNotificationSheetOpen, setIsNotificationSheetOpen] = useState(false);
  const [isGlobalSearchDialogOpen, setIsGlobalSearchDialogOpen] = useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false); // NEW: State for FeedbackDialog
  const { isCollapsed } = useSidebar(); // NEW: Use isCollapsed from SidebarContext

  const sidebarWidthCollapsed = 80; // Matches Sidebar.tsx collapsed width
  const sidebarWidthExpanded = 280; // Matches Sidebar.tsx expanded width

  return (
    <div className="app-main-layout min-h-screen flex bg-background text-foreground ">
      {isMobile ? (
        <div className="flex flex-col w-full">
          <Header
            setIsNotificationSheetOpen={setIsNotificationSheetOpen}
            setIsGlobalSearchDialogOpen={setIsGlobalSearchDialogOpen}
            setIsFeedbackDialogOpen={setIsFeedbackDialogOpen} // NEW: Pass setIsFeedbackDialogOpen
            className="shadow-theme-glow" // NEW: Apply shadow-theme-glow
          />
          <AnnouncementBar
            message="Welcome to Fortress. Let's Get You Set Up."
            linkTo="/setup-instructions"
            linkText="Click here"
          />
          <main className="flex-grow p-4 container mx-auto">
            <Outlet />
          </main>
          {/* REMOVED: <div className="mt-auto">
            <MadeWithDyad />
          </div> */}
        </div>
      ) : (
        <>
          {/* Desktop Sidebar */}
          <Sidebar /> {/* REMOVED: isCollapsed and onToggleCollapse props */}

          {/* Main Content Area */}
          <div
            className={cn(
              "flex-grow flex flex-col h-screen overflow-y-auto p-6 transition-all duration-200",
              "space-y-6"
            )}
            style={{ marginLeft: isCollapsed ? `${sidebarWidthCollapsed}px` : `${sidebarWidthExpanded}px` }}
          >
            <Header
              setIsNotificationSheetOpen={setIsNotificationSheetOpen}
              setIsGlobalSearchDialogOpen={setIsGlobalSearchDialogOpen}
              setIsFeedbackDialogOpen={setIsFeedbackDialogOpen} // NEW: Pass setIsFeedbackDialogOpen
              className="shadow-theme-glow" // NEW: Apply shadow-theme-glow
            />
            <AnnouncementBar
              message="Welcome to Fortress. Let's Get You Set Up."
              linkTo="/setup-instructions"
              linkText="Click here"
            />
            <main className="flex-grow bg-card rounded-lg shadow-sm p-6">
              <Outlet />
            </main>
            {/* REMOVED: <div className="mt-auto">
              <MadeWithDyad />
            </div> */}
          </div>
        </>
      )}

      {/* Global Dialogs - always rendered */}
      <NotificationSheet
        isOpen={isNotificationSheetOpen}
        onOpenChange={setIsNotificationSheetOpen}
      />
      <GlobalSearchDialog
        isOpen={isGlobalSearchDialogOpen}
        onClose={() => setIsGlobalSearchDialogOpen(false)}
      />
      <FeedbackDialog
        isOpen={isFeedbackDialogOpen}
        onClose={() => setIsFeedbackDialogOpen(false)}
      />
    </div>
  );
};

export default Layout;