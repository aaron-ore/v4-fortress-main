"use client";

import React, { useEffect } from "react";
import { useProfile } from "@/context/ProfileContext";
import { useTheme } from "next-themes";

interface ThemeInitializerProps {
  children: React.ReactNode;
}

const ThemeInitializer: React.FC<ThemeInitializerProps> = ({ children }) => {
  const { profile, isLoadingProfile } = useProfile();
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    if (!isLoadingProfile && profile?.organizationTheme && theme !== profile.organizationTheme) {
      console.log(`[ThemeInitializer] Setting theme to: ${profile.organizationTheme}`);
      setTheme(profile.organizationTheme);
    }
  }, [isLoadingProfile, profile?.organizationTheme, setTheme, theme]);

  return <>{children}</>;
};

export default ThemeInitializer;