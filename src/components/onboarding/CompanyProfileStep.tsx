import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOnboarding } from "@/context/OnboardingContext";
import { showError, showSuccess } from "@/utils/toast";
import { uploadFileToSupabase } from "@/integrations/supabase/storage";
import { Image as ImageIcon, Loader2, X } from "lucide-react"; // NEW: Import X icon
import { useProfile } from "@/context/ProfileContext"; // NEW: Import useProfile

export interface CompanyProfileStepProps { // Exported interface
  onNext: () => void;
  onBack?: () => void; // Added onBack prop
}

const CompanyProfileStep: React.FC<CompanyProfileStepProps> = ({ onNext }) => {
  const { companyProfile, setCompanyProfile } = useOnboarding();
  const { profile } = useProfile(); // NEW: Get profile from ProfileContext

  const [companyName, setCompanyName] = useState(companyProfile?.name || "");
  const [currency, setCurrency] = useState(companyProfile?.currency || "USD");
  const [address, setAddress] = useState(companyProfile?.address || "");
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [companyLogoUrlPreview, setCompanyLogoUrlPreview] = useState(companyProfile?.companyLogoUrl || "");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    // Initialize state from companyProfile (derived from ProfileContext)
    if (companyProfile) {
      setCompanyName(companyProfile.name);
      setCurrency(companyProfile.currency);
      setAddress(companyProfile.address);
      setCompanyLogoUrlPreview(companyProfile.companyLogoUrl || "");
    } else if (profile) {
      // If companyProfile is null but profile exists, use profile's organization data if available
      setCompanyName(profile.companyName || "");
      setCurrency(profile.companyCurrency || "USD");
      setAddress(profile.companyAddress || "");
      setCompanyLogoUrlPreview(profile.companyLogoUrl || "");
    }
  }, [companyProfile, profile]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (file.type.startsWith("image/")) {
        setCompanyLogoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setCompanyLogoUrlPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        showError("Please select an image file (PNG, JPG, GIF, SVG).");
        setCompanyLogoFile(null);
        setCompanyLogoUrlPreview(companyProfile?.companyLogoUrl || "");
      }
    } else {
      setCompanyLogoFile(null);
      setCompanyLogoUrlPreview(companyProfile?.companyLogoUrl || "");
    }
  };

  const handleClearLogo = () => { // NEW: Handler to clear the logo
    setCompanyLogoFile(null);
    setCompanyLogoUrlPreview("");
    showSuccess("Logo cleared. Save changes to apply.");
  };

  const handleSave = async () => {
    if (!companyName || !currency || !address) {
      showError("Please fill in all company profile fields.");
      return;
    }

    let finalCompanyLogoUrl = companyLogoUrlPreview;

    if (companyLogoFile) {
      setIsUploadingLogo(true);
      try {
        finalCompanyLogoUrl = await uploadFileToSupabase(companyLogoFile, 'company-logos', 'logos/');
        showSuccess("Company logo uploaded successfully!");
      } catch (error: any) {
        console.error("Error uploading company logo:", error);
        showError(`Failed to upload company logo: ${error.message}`);
        setIsUploadingLogo(false);
        return;
      } finally {
        setIsUploadingLogo(false);
      }
    } else if (companyLogoUrlPreview === "") {
      // If preview is empty and no new file, it means user cleared the logo
      finalCompanyLogoUrl = undefined;
    }

    try {
      await setCompanyProfile({ name: companyName, currency, address, companyLogoUrl: finalCompanyLogoUrl || undefined });
      // showSuccess("Company profile updated successfully!"); // Moved to OnboardingContext
      onNext(); // Only call onNext if successful
    } catch (error: any) {
      showError(`Failed to set up/update organization: ${error.message}`); // Use the error message from setCompanyProfile
    }
  };

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-bold text-foreground">Company Profile</h2>
      <p className="text-muted-foreground">Let's start by setting up your basic company information.</p>

      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name <span className="text-red-500">*</span></Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g., Acme Corp"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Default Currency <span className="text-red-500">*</span></Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($) - United States Dollar</SelectItem>
              <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
              <SelectItem value="GBP">GBP (£) - British Pound</SelectItem>
              <SelectItem value="CAD">CAD ($) - Canadian Dollar</SelectItem>
              <SelectItem value="AUD">AUD ($) - Australian Dollar</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Company Address <span className="text-red-500">*</span></Label>
          <Textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Business Rd, Suite 100, City, State, Zip"
            rows={3}
          />
        </div>
        {/* Company Logo File Input and Preview */}
        <div className="space-y-2">
          <Label htmlFor="companyLogoFile">Company Logo (Optional)</Label>
          <Input
            id="companyLogoFile"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
          {companyLogoUrlPreview ? (
            <div className="mt-2 p-2 border border-border rounded-md flex items-center justify-between bg-muted/20">
              <img src={companyLogoUrlPreview} alt="Company Logo Preview" className="max-h-24 object-contain" />
              <Button variant="ghost" size="icon" onClick={handleClearLogo} aria-label="Clear logo">
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <div className="mt-2 p-4 border border-dashed border-muted-foreground/50 rounded-md flex items-center justify-center text-muted-foreground text-sm">
              <ImageIcon className="h-5 w-5 mr-2" /> No logo selected
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isUploadingLogo}>
          {isUploadingLogo ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
            </>
          ) : (
            "Next"
          )}
        </Button>
      </div>
    </div>
  );
};

export default CompanyProfileStep;