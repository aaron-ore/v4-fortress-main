import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CompanyProfileStep from "./CompanyProfileStep";
import { CompanyProfileStepProps } from "./CompanyProfileStep"; // Import the interface
import LocationSetupStep from "./LocationSetupStep";
import { LocationSetupStepProps } from "./LocationSetupStep"; // Import the interface
// import ProductImportStep from "./ProductImportStep"; // Removed
import { useOnboarding } from "@/context/OnboardingContext";

const OnboardingWizard: React.FC = () => {
  const { isOnboardingComplete, markOnboardingComplete } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Company Profile",
      component: CompanyProfileStep as React.FC<CompanyProfileStepProps>, // Cast to ensure type compatibility
    },
    {
      title: "Warehouse & Locations",
      component: LocationSetupStep as React.FC<LocationSetupStepProps>, // Cast to ensure type compatibility
    },
    // Removed ProductImportStep
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      markOnboardingComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <Dialog open={!isOnboardingComplete} onOpenChange={() => { /* Prevent closing */ }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            Welcome to Fortress!
            <div className="text-sm text-muted-foreground mt-1">
              Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <CurrentStepComponent onNext={handleNext} onBack={handleBack} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingWizard;