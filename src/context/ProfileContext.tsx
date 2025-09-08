"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { parseAndValidateDate } from "@/utils/dateUtils"; // NEW: Import parseAndValidateDate
import { isValid } from "date-fns"; // Import isValid for date validation

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  avatarUrl?: string;
  role: string;
  organizationId: string | null;
  organizationCode?: string; // NEW: Add organizationCode
  organizationTheme?: string; // NEW: Add organizationTheme
  companyName?: string; // NEW: Add companyName
  companyAddress?: string; // NEW: Add companyAddress
  companyCurrency?: string; // NEW: Add companyCurrency
  companyLogoUrl?: string; // NEW: Add companyLogoUrl
  createdAt: string;
  quickbooksAccessToken?: string; // NEW: Add QuickBooks Access Token
  quickbooksRefreshToken?: string; // NEW: Add QuickBooks Refresh Token
  quickbooksRealmId?: string; // NEW: Add QuickBooks Realm ID
  shopifyAccessToken?: string; // NEW: Add Shopify Access Token
  shopifyStoreName?: string; // NEW: Add Shopify Store Name
}

interface ProfileContextType {
  profile: UserProfile | null;
  allProfiles: UserProfile[];
  isLoadingProfile: boolean;
  updateProfile: (updates: Partial<Omit<UserProfile, "id" | "email" | "createdAt" | "role" | "organizationId" | "organizationCode" | "organizationTheme" | "companyName" | "companyAddress" | "companyCurrency" | "companyLogoUrl" | "quickbooksAccessToken" | "quickbooksRefreshToken" | "quickbooksRealmId" | "shopifyAccessToken" | "shopifyStoreName">>) => Promise<void>;
  updateUserRole: (userId: string, newRole: string, organizationId: string | null) => Promise<void>;
  updateOrganizationTheme: (theme: string) => Promise<void>; // NEW: Add updateOrganizationTheme
  fetchProfile: () => Promise<void>;
  fetchAllProfiles: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const errorToastId = useRef<string | number | null>(null);

  const mapSupabaseProfileToUserProfile = (p: any, sessionEmail?: string): UserProfile => {
    // Ensure created_at is always a valid ISO string
    const validatedCreatedAt = parseAndValidateDate(p.created_at);
    const createdAtString = validatedCreatedAt ? validatedCreatedAt.toISOString() : new Date().toISOString(); // Fallback to current date if invalid

    // Safely access organization data, whether it's an array or a direct object
    const organizationData = Array.isArray(p.organizations) ? p.organizations[0] : p.organizations;
    
    const organizationCode = organizationData?.unique_code || undefined;
    const organizationTheme = organizationData?.default_theme || 'dark';
    const companyName = organizationData?.name || undefined; // NEW: Map company name
    const companyAddress = organizationData?.address || undefined; // NEW: Map company address
    const companyCurrency = organizationData?.currency || undefined; // NEW: Map company currency
    const companyLogoUrl = organizationData?.company_logo_url || undefined; // NEW: Map company logo URL
    const shopifyAccessToken = organizationData?.shopify_access_token || undefined; // NEW: Map shopify_access_token
    const shopifyStoreName = organizationData?.shopify_store_name || undefined; // NEW: Map shopify_store_name

    if (p.organization_id && !organizationCode) {
      console.warn(`[ProfileContext] User ${p.id} has organization_id ${p.organization_id} but no unique_code found for organization.`);
    }

    return {
      id: p.id,
      fullName: p.full_name || "", // Ensure string fallback
      email: p.email || sessionEmail || "", // Ensure string fallback
      phone: p.phone || undefined,
      address: p.address || undefined,
      avatarUrl: p.avatar_url || undefined,
      role: p.role || "viewer", // Default role
      organizationId: p.organization_id,
      organizationCode: organizationCode,
      organizationTheme: organizationTheme,
      companyName: companyName, // NEW: Assign companyName
      companyAddress: companyAddress, // NEW: Assign companyAddress
      companyCurrency: companyCurrency, // NEW: Assign companyCurrency
      companyLogoUrl: companyLogoUrl, // NEW: Assign companyLogoUrl
      createdAt: createdAtString,
      quickbooksAccessToken: p.quickbooks_access_token || undefined,
      quickbooksRefreshToken: p.quickbooks_refresh_token || undefined,
      quickbooksRealmId: p.quickbooks_realm_id || undefined,
      shopifyAccessToken: shopifyAccessToken, // NEW: Assign shopifyAccessToken
      shopifyStoreName: shopifyStoreName, // NEW: Assign shopifyStoreName
    };
  };

  const fetchProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    const { data: { session } } = await supabase.auth.getSession();

    console.log("[ProfileContext] fetchProfile called. Session:", session);

    if (!session) {
      setProfile(null);
      setIsLoadingProfile(false);
      console.log("[ProfileContext] No session found. Profile set to null.");
      return;
    }

    let userProfileData = null;
    let profileFetchError = null;

    const selectString = "id, full_name, phone, address, avatar_url, role, organization_id, created_at, email, quickbooks_access_token, quickbooks_refresh_token, quickbooks_realm_id";
    console.log("[ProfileContext] fetchProfile - Attempting to select string:", selectString);

    // 1. Fetch profile without the organizations join
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select(selectString)
      .eq("id", session.user.id)
      .single();

    console.log("[ProfileContext] Raw profile data from DB (before org join):", profileData);
    console.log("[ProfileContext] Profile fetch error:", profileError);

    if (profileError && profileError.code === 'PGRST116') {
      console.warn(`[ProfileContext] No profile found for user ${session.user.id}. This might be a new user or a missing profile entry.`);
      profileFetchError = new Error("User profile not found after authentication.");
    } else if (profileError) {
      console.error("[ProfileContext] Error fetching profile:", profileError);
      profileFetchError = profileError;
    } else if (profileData) {
      userProfileData = profileData;
      console.log("[ProfileContext] Successfully fetched basic profile data:", userProfileData);

      // 2. If organization_id exists, fetch organization details separately
      if (userProfileData.organization_id) {
        console.log(`[ProfileContext] Fetching organization details separately for organization_id: ${userProfileData.organization_id}.`);
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('unique_code, default_theme, name, address, currency, company_logo_url, shopify_access_token, shopify_store_name') // NEW: Select company profile fields
          .eq('id', userProfileData.organization_id)
          .single();

        console.log("[ProfileContext] Raw organization data:", orgData);
        console.log("[ProfileContext] Organization fetch error:", orgError);

        if (orgError) {
          console.error("[ProfileContext] Error fetching organization separately:", orgError);
          // Don't fail the whole profile fetch, just log the error and proceed without org data
        } else if (orgData) {
          // 3. Merge organization data into userProfileData
          userProfileData = { ...userProfileData, organizations: orgData };
          console.log("[ProfileContext] Successfully fetched and attached organization data separately:", orgData);
        }
      }
    }

    if (profileFetchError) {
      setProfile(null);
      console.log("[ProfileContext] Profile fetch error occurred. Profile set to null.");
    } else if (userProfileData) {
      const mappedProfile = mapSupabaseProfileToUserProfile(userProfileData, session.user.email);
      setProfile(mappedProfile);
      console.log("[ProfileContext] Mapped profile object:", mappedProfile);
      console.log("[ProfileContext] Loaded user role:", mappedProfile.role);
    }
    setIsLoadingProfile(false);
    console.log("[ProfileContext] fetchProfile finished.");
  }, []);

  const fetchAllProfiles = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || profile?.role !== 'admin' || !profile?.organizationId) {
      setAllProfiles([]);
      return;
    }

    // Simplified select statement for fetchAllProfiles
    const selectString = "id, full_name, phone, address, avatar_url, role, organization_id, created_at, email, quickbooks_access_token, quickbooks_refresh_token, quickbooks_realm_id";
    console.log("[ProfileContext] fetchAllProfiles - Attempting to select string:", selectString);

    const { data, error } = await supabase
      .from("profiles")
      .select(selectString) // Removed organizations(...) join here
      .eq("organization_id", profile.organizationId);

    if (error) {
      console.error("Error fetching all profiles:", error);
      setAllProfiles([]);
    } else if (data) {
      // For each profile, manually fetch organization details if needed (or accept null for list view)
      const fetchedProfiles: UserProfile[] = await Promise.all(data.map(async (p: any) => {
        let profileWithOrg = p;
        if (p.organization_id) {
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('unique_code, default_theme, name, address, currency, company_logo_url, shopify_access_token, shopify_store_name') // NEW: Select company profile fields
            .eq('id', p.organization_id)
            .single();
          if (orgError) {
            console.warn(`[ProfileContext] Error fetching organization for profile ${p.id}:`, orgError);
          } else if (orgData) {
            profileWithOrg = { ...p, organizations: orgData };
          }
        }
        return mapSupabaseProfileToUserProfile(profileWithOrg);
      }));
      setAllProfiles(fetchedProfiles);
    }
  }, [profile?.role, profile?.organizationId]);

  useEffect(() => {
    fetchProfile();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfile();
      } else {
        setProfile(null);
        setAllProfiles([]);
        setIsLoadingProfile(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile?.role === 'admin' && profile.organizationId) {
      fetchAllProfiles();
    } else {
      setAllProfiles([]);
    }
  }, [profile?.role, profile?.organizationId, fetchAllProfiles]);

  const updateProfile = async (updates: Partial<Omit<UserProfile, "id" | "email" | "createdAt" | "role" | "organizationId" | "organizationCode" | "organizationTheme" | "companyName" | "companyAddress" | "companyCurrency" | "companyLogoUrl" | "quickbooksAccessToken" | "quickbooksRefreshToken" | "quickbooksRealmId" | "shopifyAccessToken" | "shopifyStoreName">>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      showError("You must be logged in to update your profile.");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: updates.fullName,
        phone: updates.phone,
        address: updates.address,
        avatar_url: updates.avatarUrl,
      })
      .eq("id", session.user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating profile:", error);
      showError(`Failed to update profile: ${error.message}`);
    } else if (data) {
      setProfile(mapSupabaseProfileToUserProfile(data, session.user.email));
      showSuccess("Profile updated successfully!");
    }
  };

  const updateOrganizationTheme = async (theme: string) => {
    if (!profile || profile.role !== 'admin' || !profile.organizationId) {
      showError("You do not have permission to update the organization's theme.");
      return;
    }

    const { error } = await supabase
      .from('organizations')
      .update({ default_theme: theme })
      .eq('id', profile.organizationId);

    if (error) {
      console.error("Error updating organization theme:", error);
      showError(`Failed to update organization theme: ${error.message}`);
    } else {
      showSuccess("Organization theme updated successfully!");
      // Refresh profile to get the new theme
      fetchProfile();
    }
  };

  const updateUserRole = async (userId: string, newRole: string, organizationId: string | null) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || profile?.role !== 'admin' || !profile?.organizationId) {
      showError("You do not have permission to update user roles.");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('update-user-profile', {
        body: JSON.stringify({
          targetUserId: userId,
          newRole: newRole,
          organizationId: organizationId,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const updatedProfileData = data.profile;

      setAllProfiles((prevProfiles) =>
        prevProfiles.map((p) =>
          p.id === updatedProfileData.id ? {
            ...mapSupabaseProfileToUserProfile(updatedProfileData),
            organizationCode: profile?.organizationCode, // Keep existing organizationCode
          } : p
        )
      );
      showSuccess(`Role for ${updatedProfileData.full_name || updatedProfileData.id} updated to ${newRole}!`);
      if (session.user.id === updatedProfileData.id) {
        fetchProfile();
      }
    } catch (error: any) {
      console.error("Error calling Edge Function to update user role:", error);
      showError(`Failed to update role for user ${userId}: ${error.message}`);
    }
  };

  return (
    <ProfileContext.Provider value={{ profile, allProfiles, isLoadingProfile, updateProfile, updateUserRole, updateOrganizationTheme, fetchProfile, fetchAllProfiles }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
};