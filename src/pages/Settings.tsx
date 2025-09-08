import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfile } from "@/context/ProfileContext";
import { showError, showSuccess } from "@/utils/toast";
import { Loader2, Palette, Settings as SettingsIcon, Image as ImageIcon, X } from "lucide-react";
import { useOnboarding } from "@/context/OnboardingContext";
import { Link } from "react-router-dom";
import { uploadFileToSupabase } from "@/integrations/supabase/storage";

const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme(); // Current active theme from next-themes
  const { profile, updateProfile, isLoadingProfile, fetchProfile, updateOrganizationTheme } = useProfile();
  const { companyProfile, setCompanyProfile, locations, addLocation, removeLocation } = useOnboarding();

  const [companyName, setCompanyName] = useState(profile?.companyName || ""); // Derived from profile
  const [companyAddress, setCompanyAddress] = useState(profile?.companyAddress || ""); // Derived from profile
  const [companyCurrency, setCompanyCurrency] = useState(profile?.companyCurrency || "USD"); // Derived from profile
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [companyLogoUrlPreview, setCompanyLogoUrlPreview] = useState(profile?.companyLogoUrl || ""); // Derived from profile
  const [isSavingCompanyProfile, setIsSavingCompanyProfile] = useState(false);
  const [organizationCodeInput, setOrganizationCodeInput] = useState(profile?.organizationCode || "");
  const [isSavingOrganizationCode, setIsSavingOrganizationCode] = useState(false);

  // NEW: State for theme selection
  const [selectedTheme, setSelectedTheme] = useState(profile?.organizationTheme || "dark");
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.companyName || "");
      setCompanyAddress(profile.companyAddress || "");
      setCompanyCurrency(profile.companyCurrency || "USD");
      setCompanyLogoUrlPreview(profile.companyLogoUrl || "");
      setOrganizationCodeInput(profile.organizationCode || "");
      // NEW: Update selectedTheme when profile.organizationTheme changes
      setSelectedTheme(profile.organizationTheme || "dark");
    }
  }, [profile]);

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
        setCompanyLogoUrlPreview(profile?.companyLogoUrl || "");
      }
    } else {
      setCompanyLogoFile(null);
      setCompanyLogoUrlPreview(profile?.companyLogoUrl || "");
    }
  };

  const handleClearLogo = () => {
    setCompanyLogoFile(null);
    setCompanyLogoUrlPreview("");
    showSuccess("Logo cleared. Save changes to apply.");
  };

  const handleSaveCompanyProfile = async () => {
    if (!companyName || !companyCurrency || !companyAddress) {
      showError("Please fill in all company profile fields.");
      return;
    }

    setIsSavingCompanyProfile(true);
    let finalCompanyLogoUrl = companyLogoUrlPreview;

    if (companyLogoFile) {
      try {
        finalCompanyLogoUrl = await uploadFileToSupabase(companyLogoFile, 'company-logos', 'logos/');
        showSuccess("Company logo uploaded successfully!");
      } catch (error: any) {
        console.error("Error uploading company logo:", error);
        showError(`Failed to upload company logo: ${error.message}`);
        setIsSavingCompanyProfile(false);
        return;
      }
    } else if (companyLogoUrlPreview === "") {
      finalCompanyLogoUrl = undefined;
    }

    try {
      await setCompanyProfile({
        name: companyName,
        address: companyAddress,
        currency: companyCurrency,
        companyLogoUrl: finalCompanyLogoUrl,
      }, organizationCodeInput);
    } catch (error: any) {
      showError(`Failed to update company profile: ${error.message}`);
    } finally {
      setIsSavingCompanyProfile(false);
    }
  };

  const handleSaveOrganizationCode = async () => {
    if (!profile?.organizationId) {
      showError("Organization not found. Please set up your company profile first.");
      return;
    }
    if (!organizationCodeInput.trim()) {
      showError("Organization Code cannot be empty.");
      return;
    }
    if (organizationCodeInput === profile.organizationCode) {
      showSuccess("No changes to save for Organization Code.");
      return;
    }

    setIsSavingOrganizationCode(true);
    try {
      await setCompanyProfile({
        name: companyName,
        address: companyAddress,
        currency: companyCurrency,
        companyLogoUrl: companyLogoUrlPreview || undefined,
      }, organizationCodeInput.trim());
    } catch (error: any) {
      showError(`Failed to update Organization Code: ${error.message}`);
    } finally {
      setIsSavingOrganizationCode(false);
    }
  };

  // NEW: Handle saving theme
  const handleSaveTheme = async () => {
    if (!profile?.organizationId) {
      showError("Organization not found. Please set up your company profile first.");
      return;
    }
    if (selectedTheme === (profile?.organizationTheme || "dark")) {
      showSuccess("No changes to save for Theme.");
      return;
    }
    setIsSavingTheme(true);
    try {
      await updateOrganizationTheme(selectedTheme);
      setTheme(selectedTheme); // Immediately apply theme to UI
    } catch (error: any) {
      showError(`Failed to update theme: ${error.message}`);
    } finally {
      setIsSavingTheme(false);
    }
  };

  const hasCompanyProfileChanges =
    companyName !== (profile?.companyName || "") ||
    companyAddress !== (profile?.companyAddress || "") ||
    companyCurrency !== (profile?.companyCurrency || "USD") ||
    companyLogoUrlPreview !== (profile?.companyLogoUrl || "") ||
    companyLogoFile !== null;

  const hasOrganizationCodeChanges = organizationCodeInput !== (profile?.organizationCode || "");
  const hasThemeChanges = selectedTheme !== (profile?.organizationTheme || "dark");

  const availableThemes = ['dark', 'ocean-breeze', 'sunset-glow', 'forest-whisper', 'emerald', 'deep-forest', 'natural-light'];

  return (
    <div className="flex flex-col space-y-6 p-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Company Profile</CardTitle>
          <CardDescription>Manage your company's basic information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyCurrency">Default Currency</Label>
              <Select value={companyCurrency} onValueChange={setCompanyCurrency}>
                <SelectTrigger id="companyCurrency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="JPY">JPY (¥)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyAddress">Company Address</Label>
            <Textarea
              id="companyAddress"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
            />
          </div>
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
          <Button onClick={handleSaveCompanyProfile} disabled={isSavingCompanyProfile || !hasCompanyProfileChanges}>
            {isSavingCompanyProfile ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              "Save Company Profile"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* NEW: Theme Settings - only for admins */}
      {profile?.role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-6 w-6 text-primary" /> Organization Theme
            </CardTitle>
            <CardDescription>
              Select a theme for your entire organization. This will apply to all users.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={selectedTheme} onValueChange={setSelectedTheme} className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {availableThemes.map(t => (
                <div key={t} className="flex items-center space-x-2">
                  <RadioGroupItem value={t} id={`theme-${t}`} />
                  <Label htmlFor={`theme-${t}`} className="capitalize">
                    {t.replace(/-/g, ' ')}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <Button onClick={handleSaveTheme} disabled={isSavingTheme || !hasThemeChanges}>
              {isSavingTheme ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Theme...
                </>
              ) : (
                "Save Theme"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Organization Code Settings */}
      {profile?.role === 'admin' && profile?.organizationId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-6 w-6 text-primary" /> Organization Code
            </CardTitle>
            <CardDescription>
              Set or update the unique code for your organization. New users can use this code to join.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organizationCode">Unique Organization Code</Label>
              <Input
                id="organizationCode"
                value={organizationCodeInput}
                onChange={(e) => setOrganizationCodeInput(e.target.value)}
                placeholder="e.g., MYCOMPANY123"
              />
            </div>
            <Button onClick={handleSaveOrganizationCode} disabled={isSavingOrganizationCode || !hasOrganizationCodeChanges}>
              {isSavingOrganizationCode ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Code...
                </>
              ) : (
                "Save Organization Code"
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Settings;