"use client";

import React, { useEffect, useMemo } from "react"; // NEW: Import useEffect
import { useProfile } from "@/context/ProfileContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import AppContent from "@/AppContent";
import { useTheme } from "next-themes"; // NEW: Import useTheme

const ThemedAppContent: React.FC = () => {
  const { profile, isLoadingProfile } = useProfile();
  const { setTheme } = useTheme(); // NEW: Get setTheme from useTheme

  // Determine the default theme based on organization settings, fallback to 'dark'
  const defaultTheme = useMemo(() => {
    if (!isLoadingProfile && profile?.organizationTheme) {
      return profile.organizationTheme;
    }
    return "dark";
  }, [profile?.organizationTheme, isLoadingProfile]);

  // NEW: Effect to explicitly set the theme from the profile
  useEffect(() => {
    if (!isLoadingProfile && profile?.organizationTheme) {
      setTheme(profile.organizationTheme);
    }
  }, [isLoadingProfile, profile?.organizationTheme, setTheme]);

  return (
    <ThemeProvider defaultTheme={defaultTheme}>
      <AppContent />
    </ThemeProvider>
  );
};

export default ThemedAppContent;