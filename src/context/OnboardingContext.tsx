import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { showSuccess, showError } from "@/utils/toast";
import { useProfile } from "./ProfileContext";
import { supabase } from "@/lib/supabaseClient";
import { generateUniqueCode } from "@/utils/numberGenerator";
import { mockCompanyProfile } from "@/utils/mockData"; // Import mock data, but locations will be fetched from DB
import { parseLocationString } from "@/utils/locationParser"; // Import parseLocationString

export interface CompanyProfile {
  name: string;
  currency: string;
  address: string;
  companyLogoUrl?: string; // NEW: Add companyLogoUrl
}

export interface Location {
  id: string;
  organizationId: string;
  fullLocationString: string; // e.g., "A-01-01-1-A"
  displayName?: string; // e.g., "Main Warehouse"
  area: string;
  row: string;
  bay: string;
  level: string;
  pos: string;
  color: string; // Hex code
  createdAt: string;
  userId: string;
}

interface OnboardingContextType {
  isOnboardingComplete: boolean;
  companyProfile: CompanyProfile | null;
  locations: Location[]; // Changed to Location[]
  markOnboardingComplete: () => void;
  setCompanyProfile: (profile: CompanyProfile, uniqueCode?: string) => Promise<void>; // Add uniqueCode parameter, make async
  addLocation: (location: Omit<Location, "id" | "createdAt" | "userId" | "organizationId">) => Promise<Location | null>; // Takes structured data, returns Location or null
  updateLocation: (location: Omit<Location, "createdAt" | "userId" | "organizationId">) => Promise<void>; // Takes structured data
  removeLocation: (locationId: string) => Promise<void>; // Removes by ID
  fetchLocations: () => Promise<void>; // Added fetch function
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Helper function to extract storage path from URL (replicated from SQL function)
const getStoragePathFromUrl = (url: string): string | null => {
  const match = url.match(/public\/company-logos\/(.*)/);
  return match ? match[1] : null;
};

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile, isLoadingProfile, fetchProfile } = useProfile();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      // Onboarding is considered complete if a profile exists and has an organization ID
      return localStorage.getItem("onboarding_skipped") === "true" || (profile?.organizationId !== null && profile?.organizationId !== undefined);
    }
    return false;
  });

  // Derive companyProfile directly from the profile context
  const companyProfile: CompanyProfile | null = React.useMemo(() => {
    if (profile?.organizationId && profile.companyName && profile.companyAddress && profile.companyCurrency) {
      return {
        name: profile.companyName,
        address: profile.companyAddress,
        currency: profile.companyCurrency,
        companyLogoUrl: profile.companyLogoUrl,
      };
    }
    return null;
  }, [profile]);

  const [locations, setLocations] = useState<Location[]>([]); // Now stores Location objects

  // Effect to check onboarding status
  useEffect(() => {
    if (!isLoadingProfile) {
      // If profile has an organizationId, onboarding is considered complete
      if (profile?.organizationId) {
        setIsOnboardingComplete(true);
      } else {
        // If no organizationId, check if onboarding was explicitly skipped
        setIsOnboardingComplete(localStorage.getItem("onboarding_skipped") === "true");
      }
    } else if (!isLoadingProfile && !profile) {
      setIsOnboardingComplete(false);
    }
  }, [profile, isLoadingProfile]);

  // Helper function to map Supabase data to Location interface
  const mapSupabaseLocationToLocation = (data: any): Location => ({
    id: data.id,
    organizationId: data.organization_id,
    fullLocationString: data.full_location_string,
    displayName: data.display_name || undefined,
    area: data.area,
    row: data.row,
    bay: data.bay,
    level: data.level,
    pos: data.pos,
    color: data.color,
    createdAt: data.created_at,
    userId: data.user_id,
  });

  // Fetch locations from Supabase
  const fetchLocations = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      setLocations([]);
      return;
    }

    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .order("full_location_string", { ascending: true });

    if (error) {
      console.error("Error fetching locations:", error);
      showError("Failed to load locations.");
      setLocations([]);
    } else {
      setLocations(data.map(mapSupabaseLocationToLocation));
    }
  };

  // Effect to fetch locations on profile load or change
  useEffect(() => {
    if (!isLoadingProfile && profile?.organizationId) {
      fetchLocations();
    } else if (!isLoadingProfile && !profile?.organizationId) {
      setLocations([]); // Clear locations if no organization
    }
  }, [isLoadingProfile, profile?.organizationId]);


  const markOnboardingComplete = () => {
    setIsOnboardingComplete(true);
    localStorage.setItem("onboarding_skipped", "true"); // Mark as skipped if user completes it
    showSuccess("Onboarding complete! Welcome to Fortress.");
  };

  const setCompanyProfile = async (profileData: CompanyProfile, newUniqueCode?: string) => { // Add newUniqueCode parameter
    console.log("[OnboardingContext] setCompanyProfile called with profileData:", profileData, "newUniqueCode:", newUniqueCode);

    if (!profile) { // Ensure profile is not null before proceeding
      console.warn("[OnboardingContext] Profile is null, cannot save company profile to Supabase.");
      showError("User profile not loaded. Please log in again.");
      return;
    }

    try {
      let organizationIdToUse = profile.organizationId;
      let uniqueCodeToPersist = newUniqueCode;

      if (!profile.organizationId) {
        console.log("[OnboardingContext] User has no organization_id. Creating new organization.");
        if (!uniqueCodeToPersist) { // If no uniqueCode provided, generate one
          uniqueCodeToPersist = generateUniqueCode();
        }
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({ name: profileData.name, address: profileData.address, currency: profileData.currency, unique_code: uniqueCodeToPersist, company_logo_url: profileData.companyLogoUrl }) // NEW: Save company_logo_url
          .select()
          .single();

        if (orgError) throw orgError;

        organizationIdToUse = orgData.id;
        console.log("[OnboardingContext] New organization created:", orgData);

        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ organization_id: organizationIdToUse, role: 'admin' })
          .eq('id', profile.id);

        if (profileUpdateError) throw profileUpdateError;
        console.log("[OnboardingContext] Profile updated with new organization_id and role.");

        showSuccess(`Organization "${profileData.name}" created and assigned! You are now an admin. Your unique company code is: ${uniqueCodeToPersist}`);
      } else {
        console.log("[OnboardingContext] User already has organization_id:", profile.organizationId);

        // --- NEW CHECK FOR DUPLICATE ORGANIZATION NAME ---
        const { data: existingOrgWithName, error: checkNameError } = await supabase
          .from('organizations')
          .select('id')
          .eq('name', profileData.name)
          .neq('id', profile.organizationId) // Exclude the current organization
          .single();

        if (checkNameError && checkNameError.code !== 'PGRST116') { // PGRST116 means no rows found
          throw checkNameError; // Re-throw if it's a real error, not just no match
        }

        if (existingOrgWithName) {
          throw new Error(`An organization with the name "${profileData.name}" already exists. Please choose a different name.`);
        }
        // --- END NEW CHECK ---

        const { data: existingOrg, error: fetchOrgError } = await supabase
          .from('organizations')
          .select('unique_code, company_logo_url') // Fetch existing company_logo_url
          .eq('id', profile.organizationId)
          .single();

        if (fetchOrgError && fetchOrgError.code !== 'PGRST116') {
          throw fetchOrgError;
        }
        console.log("[OnboardingContext] Existing organization fetched:", existingOrg);

        if (!uniqueCodeToPersist) { // If no newUniqueCode provided, use existing or generate if missing
          if (!existingOrg?.unique_code) {
            uniqueCodeToPersist = generateUniqueCode();
            console.log(`[OnboardingContext] Generated missing unique_code: ${uniqueCodeToPersist} for organization ${profile.organizationId}`);
          } else {
            uniqueCodeToPersist = existingOrg.unique_code;
            console.log(`[OnboardingContext] Existing unique_code found: ${uniqueCodeToPersist}`);
          }
        } else {
           console.log(`[OnboardingContext] Using provided newUniqueCode: ${uniqueCodeToPersist}`);
        }

        const oldCompanyLogoUrl = existingOrg?.company_logo_url;
        // If the new logo URL is null/undefined/empty AND an old one existed, delete the old file
        if ((profileData.companyLogoUrl === undefined || profileData.companyLogoUrl === null || profileData.companyLogoUrl === "") && oldCompanyLogoUrl) {
            const oldFilePath = getStoragePathFromUrl(oldCompanyLogoUrl);
            if (oldFilePath) {
                console.log(`[OnboardingContext] Deleting old logo file: ${oldFilePath}`);
                const { error: deleteError } = await supabase.storage
                    .from('company-logos')
                    .remove([oldFilePath]);

                if (deleteError) {
                    console.error("[OnboardingContext] Error deleting old company logo from storage:", deleteError);
                    showError(`Failed to delete old company logo from storage: ${deleteError.message}`);
                } else {
                    console.log(`[OnboardingContext] Old logo file ${oldFilePath} deleted successfully.`);
                }
            }
        }

        const updatePayload = {
          name: profileData.name,
          address: profileData.address,
          currency: profileData.currency,
          unique_code: uniqueCodeToPersist,
          default_theme: profile.organizationTheme,
          company_logo_url: profileData.companyLogoUrl,
        };
        console.log("[OnboardingContext] Update payload for organizations table:", updatePayload);

        const { error: updateOrgError } = await supabase
          .from('organizations')
          .update(updatePayload)
          .eq('id', profile.organizationId);

        if (updateOrgError) {
          console.error("[OnboardingContext] Error updating organization:", updateOrgError);
          throw updateOrgError; // Throw the full error object
        }
        console.log("[OnboardingContext] Organization updated successfully.");
        showSuccess(`Company profile for "${profileData.name}" updated successfully!`);
      }
      
      console.log("[OnboardingContext] Calling fetchProfile to refresh user data.");
      await fetchProfile();
      console.log("[OnboardingContext] fetchProfile completed after organization update.");

    } catch (error: any) {
      console.error("[OnboardingContext] Error during organization setup/update:", error); // Log full error object
      showError(`Failed to set up/update organization: ${error.message || 'Unknown error'}`);
      throw error; // Re-throw to propagate to caller if needed
    }
  };

  // Add a new structured location
  const addLocation = async (location: Omit<Location, "id" | "createdAt" | "userId" | "organizationId">): Promise<Location | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("You must be logged in and have an organization ID to add locations.");
      return null;
    }

    // NEW: Check if location already exists in DB before inserting
    const { data: existingDbLocation, error: fetchError } = await supabase
      .from("locations")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .eq("full_location_string", location.fullLocationString)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
      console.error("Error checking for existing location:", fetchError);
      showError(`Failed to check for existing location: ${fetchError.message}`);
      return null;
    }

    if (existingDbLocation) {
      console.log(`Location "${location.fullLocationString}" already exists in DB. Skipping insert.`);
      const mappedExistingLocation = mapSupabaseLocationToLocation(existingDbLocation);
      // Ensure it's in the local state if not already
      setLocations(prev => {
        if (!prev.some(loc => loc.id === mappedExistingLocation.id)) {
          return [...prev, mappedExistingLocation];
        }
        return prev;
      });
      return mappedExistingLocation;
    }

    const { data, error } = await supabase
      .from("locations")
      .insert({
        organization_id: profile.organizationId,
        full_location_string: location.fullLocationString,
        display_name: location.displayName,
        area: location.area,
        row: location.row,
        bay: location.bay,
        level: location.level,
        pos: location.pos,
        color: location.color,
        user_id: session.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding location:", error);
      showError(`Failed to add location: ${error.message}`);
      return null;
    } else if (data) {
      const newLocation = mapSupabaseLocationToLocation(data);
      setLocations((prev) => [...prev, newLocation]);
      showSuccess(`Location "${location.displayName || location.fullLocationString}" added.`);
      return newLocation;
    }
    return null;
  };

  // Update an existing structured location
  const updateLocation = async (location: Omit<Location, "createdAt" | "userId" | "organizationId">) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("You must be logged in and have an organization ID to update locations.");
      return;
    }

    const { data, error } = await supabase
      .from("locations")
      .update({
        full_location_string: location.fullLocationString,
        display_name: location.displayName,
        area: location.area,
        row: location.row,
        bay: location.bay,
        level: location.level,
        pos: location.pos,
        color: location.color,
      })
      .eq("id", location.id)
      .eq("organization_id", profile.organizationId)
      .select()
      .single();

    if (error) {
      console.error("Error updating location:", error);
      showError(`Failed to update location: ${error.message}`);
    } else if (data) {
      setLocations((prev) =>
        prev.map((loc) => (loc.id === data.id ? mapSupabaseLocationToLocation(data) : loc))
      );
      showSuccess(`Location "${location.displayName || location.fullLocationString}" updated.`);
    }
  };

  // Remove a structured location by ID
  const removeLocation = async (locationId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("You must be logged in and have an organization ID to remove locations.");
      return;
    }

    const locationToRemove = locations.find(loc => loc.id === locationId);

    const { error } = await supabase
      .from("locations")
      .delete()
      .eq("id", locationId)
      .eq("organization_id", profile.organizationId);

    if (error) {
      console.error("Error removing location:", error);
      showError(`Failed to remove location: ${error.message}`);
    } else {
      setLocations((prev) => prev.filter((loc) => loc.id !== locationId));
      showSuccess(`Location "${locationToRemove?.displayName || locationToRemove?.fullLocationString}" removed.`);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        isOnboardingComplete,
        companyProfile,
        locations,
        markOnboardingComplete,
        setCompanyProfile,
        addLocation,
        updateLocation,
        removeLocation,
        fetchLocations,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
};