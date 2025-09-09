"use client";

import React, { useEffect, useMemo } from "react";
import { useProfile } from "@/context/ProfileContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import AppContent from "@/AppContent";
import ThemeInitializer from "@/components/ThemeInitializer"; // NEW: Import ThemeInitializer

const ThemedAppContent: React.FC = () => {
  const { profile, isLoadingProfile } = useProfile();

  // The defaultTheme prop is primarily for initial render.
  // The actual theme setting will be handled by ThemeInitializer.
  const initialDefaultTheme = useMemo(() => {
    if (!isLoadingProfile && profile?.organizationTheme) {
      return profile.organizationTheme;
    }
    return "dark";
  }, [profile?.organizationTheme, isLoadingProfile]);

  return (
    <ThemeProvider defaultTheme={initialDefaultTheme}>
      <ThemeInitializer>
        <AppContent />
      </ThemeInitializer>
    </ThemeProvider>
  );
};

export default ThemedAppContent;