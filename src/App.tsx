// src/App.tsx
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { OnboardingProvider } from "./context/OnboardingContext";
import { ProfileProvider } from "./context/ProfileContext";
import { PrintProvider } from "./context/PrintContext";
import React from "react";
import ThemedAppContent from "./components/ThemedAppContent"; // NEW: Import ThemedAppContent

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <SonnerToaster
        richColors
        position="top-right"
        duration={3000}
        closeButton
      />
      <BrowserRouter>
        <ProfileProvider>
            <OnboardingProvider>
              <PrintProvider>
                <TooltipProvider>
                  <ThemedAppContent /> {/* Render ThemedAppContent here */}
                </TooltipProvider>
              </PrintProvider>
            </OnboardingProvider>
        </ProfileProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;