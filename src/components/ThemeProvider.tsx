"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props} attribute="class" themes={['dark', 'ocean-breeze', 'sunset-glow', 'forest-whisper', 'emerald', 'deep-forest', 'natural-light']}>{children}</NextThemesProvider>;
}