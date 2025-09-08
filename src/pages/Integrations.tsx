"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plug, CheckCircle, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { useProfile } from "@/context/ProfileContext";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";

const Integrations: React.FC = () => {
  const { profile, isLoadingProfile, fetchProfile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();

  const [isSyncingQuickBooks, setIsSyncingQuickBooks] = useState(false);
  const [isSyncingShopify, setIsSyncingShopify] = useState(false);

  // Ref to prevent re-processing URL parameters on re-renders
  const qbCallbackProcessedRef = React.useRef(false);
  const shopifyCallbackProcessedRef = React.useRef(false);

  // Determine which Shopify logo to use based on theme
  const shopifyLogoSrc = theme === 'dark' || theme === 'emerald' || theme === 'deep-forest'
    ? "/shopify_logo_white.png"
    : "/shopify_logo_black.png";

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const quickbooksSuccess = params.get('quickbooks_success');
    const quickbooksError = params.get('quickbooks_error');
    const shopifySuccess = params.get('shopify_success');
    const shopifyError = params.get('shopify_error');

    // Handle QuickBooks callback
    if ((quickbooksSuccess || quickbooksError) && !qbCallbackProcessedRef.current) {
      if (quickbooksSuccess) {
        showSuccess("QuickBooks connected successfully!");
        supabase.auth.refreshSession().then(() => {
          fetchProfile();
        });
      } else if (quickbooksError) {
        showError(`QuickBooks connection failed: ${quickbooksError}`);
      }
      qbCallbackProcessedRef.current = true;
      navigate(location.pathname, { replace: true });
    }

    // Handle Shopify callback
    if ((shopifySuccess || shopifyError) && !shopifyCallbackProcessedRef.current) {
      if (shopifySuccess) {
        showSuccess("Shopify connected successfully!");
        supabase.auth.refreshSession().then(() => {
          fetchProfile();
        });
      } else if (shopifyError) {
        showError(`Shopify connection failed: ${shopifyError}`);
      }
      shopifyCallbackProcessedRef.current = true;
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, location.pathname, navigate, fetchProfile]);

  const handleConnectQuickBooks = () => {
    if (!profile?.id) {
      showError("You must be logged in to connect to QuickBooks.");
      return;
    }

    const clientId = import.meta.env.VITE_QUICKBOOKS_CLIENT_ID;

    if (!clientId) {
      showError("QuickBooks Client ID is not configured. Please add VITE_QUICKBOOKS_CLIENT_ID to your .env file.");
      return;
    }

    const redirectUri = `https://nojumocxivfjsbqnnkqe.supabase.co/functions/v1/quickbooks-oauth-callback`;
    
    const scope = "com.intuit.quickbooks.accounting openid profile email address phone";
    const responseType = "code";
    
    const statePayload = {
      userId: profile.id,
      redirectToFrontend: window.location.origin,
    };
    const encodedState = btoa(JSON.stringify(statePayload));

    const authUrl = `https://appcenter.intuit.com/app/connect/oauth2?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=${responseType}&state=${encodedState}`;
    
    window.location.href = authUrl;
  };

  const handleDisconnectQuickBooks = async () => {
    if (!profile?.quickbooksAccessToken) {
      showError("Not connected to QuickBooks.");
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ quickbooks_access_token: null, quickbooks_refresh_token: null, quickbooks_realm_id: null })
        .eq('id', profile.id);
      
      if (updateError) throw updateError;

      await fetchProfile();
      showSuccess("Disconnected from QuickBooks.");
    } catch (error: any) {
      console.error("Error disconnecting QuickBooks:", error);
      showError(`Failed to disconnect from QuickBooks: ${error.message}`);
    }
  };

  const handleSyncSalesOrders = async () => {
    if (!profile?.quickbooksAccessToken || !profile?.quickbooksRealmId) {
      showError("QuickBooks is not fully connected. Please ensure your QuickBooks company is selected and try connecting again.");
      return;
    }
    setIsSyncingQuickBooks(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        showError("You must be logged in to sync with QuickBooks.");
        return;
      }

      const { data, error } = await supabase.functions.invoke('sync-sales-orders-to-quickbooks', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      showSuccess(data.message || "Sales orders synced successfully!");
      console.log("QuickBooks Sync Results:", data.results);
      await fetchProfile();
    } catch (error: any) {
      console.error("Error syncing sales orders to QuickBooks:", error);
      showError(`Failed to sync sales orders: ${error.message}`);
    } finally {
      setIsSyncingQuickBooks(false);
    }
  };

  // Shopify Integration Handlers
  const handleConnectShopify = () => {
    if (!profile?.id) {
      showError("You must be logged in to connect to Shopify.");
      return;
    }

    const clientId = import.meta.env.VITE_SHOPIFY_CLIENT_ID;
    const shopifyStoreName = prompt("Please enter your Shopify store name (e.g., your-store.myshopify.com):");

    if (!shopifyStoreName) {
      showError("Shopify store name is required to connect.");
      return;
    }

    if (!clientId) {
      showError("Shopify Client ID is not configured. Please add VITE_SHOPIFY_CLIENT_ID to your .env file.");
      return;
    }

    const redirectUri = `https://nojumocxivfjsbqnnkqe.supabase.co/functions/v1/shopify-oauth-callback`;
    
    // Define the required Shopify scopes
    const scopes = [
      "read_products",
      "write_products",
      "read_orders",
      "write_orders",
      "read_customers",
      "write_customers",
      "read_fulfillments",
      "write_fulfillments",
      "read_inventory",
      "write_inventory",
    ];
    const scope = scopes.join(',');
    
    const statePayload = {
      userId: profile.id,
      redirectToFrontend: window.location.origin,
    };
    const encodedState = btoa(JSON.stringify(statePayload));

    const authUrl = `https://${shopifyStoreName}/admin/oauth/authorize?client_id=${clientId}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodedState}`;
    
    window.location.href = authUrl;
  };

  const handleDisconnectShopify = async () => {
    if (!profile?.organizationId || !profile?.shopifyAccessToken) {
      showError("Not connected to Shopify.");
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ shopify_access_token: null, shopify_refresh_token: null, shopify_store_name: null })
        .eq('id', profile.organizationId);
      
      if (updateError) throw updateError;

      await fetchProfile();
      showSuccess("Disconnected from Shopify.");
    } catch (error: any) {
      console.error("Error disconnecting Shopify:", error);
      showError(`Failed to disconnect from Shopify: ${error.message}`);
    }
  };

  const handleSyncShopifyProducts = async () => {
    if (!profile?.shopifyAccessToken || !profile?.shopifyStoreName) {
      showError("Shopify is not connected. Please connect your Shopify store first.");
      return;
    }
    setIsSyncingShopify(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        showError("You must be logged in to sync with Shopify.");
        return;
      }

      // Placeholder for actual Shopify sync logic (e.g., another Edge Function)
      // For now, just simulate a sync
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      showSuccess("Shopify product sync initiated (placeholder).");
      console.log("Simulating Shopify product sync for store:", profile.shopifyStoreName);

    } catch (error: any) {
      console.error("Error syncing Shopify products:", error);
      showError(`Failed to sync Shopify products: ${error.message}`);
    } finally {
      setIsSyncingShopify(false);
    }
  };

  const isQuickBooksConnected = profile?.quickbooksAccessToken && profile?.quickbooksRefreshToken && profile?.quickbooksRealmId;
  const isShopifyConnected = profile?.shopifyAccessToken && profile?.shopifyStoreName;
  const isAdmin = profile?.role === 'admin';

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading integrations...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <h1 className="text-3xl font-bold">Integrations</h1>
      <p className="text-muted-foreground">Connect Fortress with your favorite business tools for enhanced workflow.</p>

      {/* QuickBooks Integration Card */}
      <Card className="bg-card border-border rounded-lg shadow-sm p-6">
        <CardHeader className="pb-4 flex flex-row items-center gap-4">
          <img src="/Intuit_QuickBooks_logo.png" alt="QuickBooks Logo" className="h-10 object-contain" />
          <CardTitle className="text-xl font-semibold">QuickBooks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isQuickBooksConnected ? (
            <div className="flex flex-col gap-2">
              <p className="text-green-500 font-semibold">
                <CheckCircle className="inline h-4 w-4 mr-2" /> Connected to QuickBooks!
              </p>
              <p className="text-sm text-muted-foreground">
                Your Fortress account is linked with QuickBooks. You can now synchronize data.
              </p>
              <Button onClick={handleSyncSalesOrders} disabled={isSyncingQuickBooks}>
                {isSyncingQuickBooks ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" /> Sync Sales Orders to QuickBooks
                  </>
                )}
              </Button>
              <Button variant="destructive" onClick={handleDisconnectQuickBooks}>
                Disconnect QuickBooks
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground">
                Connect your QuickBooks account to enable automatic syncing of orders, inventory, and more.
              </p>
              <Button onClick={handleConnectQuickBooks} disabled={!profile?.id}>
                Connect to QuickBooks
              </Button>
              {!profile?.id && (
                <p className="text-sm text-red-500">
                  Please log in to connect to QuickBooks.
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                <AlertTriangle className="inline h-3 w-3 mr-1" />
                **Important:** Ensure the following `redirect_uri` is registered in your Intuit Developer application settings:
                <code className="block bg-muted/20 p-1 rounded-sm mt-1 text-xs font-mono break-all">
                  https://nojumocxivfjsbqnnkqe.supabase.co/functions/v1/quickbooks-oauth-callback
                </code>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shopify Integration Card */}
      <Card className="bg-card border-border rounded-lg shadow-sm p-6">
        <CardHeader className="pb-4 flex flex-row items-center gap-4">
          {/* Dynamic Shopify Logo */}
          <img src={shopifyLogoSrc} alt="Shopify Logo" className="h-10 object-contain" />
          {/* Removed CardTitle for Shopify */}
        </CardHeader>
        <CardContent className="space-y-4">
          {isShopifyConnected ? (
            <div className="flex flex-col gap-2">
              <p className="text-green-500 font-semibold">
                <CheckCircle className="inline h-4 w-4 mr-2" /> Connected to Shopify Store: {profile?.shopifyStoreName}!
              </p>
              <p className="text-sm text-muted-foreground">
                Your Fortress account is linked with Shopify. You can now synchronize product data.
              </p>
              <Button onClick={handleSyncShopifyProducts} disabled={isSyncingShopify}>
                {isSyncingShopify ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" /> Sync Products from Shopify
                  </>
                )}
              </Button>
              <Button variant="destructive" onClick={handleDisconnectShopify}>
                Disconnect Shopify
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground">
                Connect your Shopify store to import products and synchronize inventory levels.
              </p>
              <Button onClick={handleConnectShopify} disabled={!profile?.id}>
                Connect to Shopify
              </Button>
              {!profile?.id && (
                <p className="text-sm text-red-500">
                  Please log in to connect to Shopify.
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                <AlertTriangle className="inline h-3 w-3 mr-1" />
                **Important:** Ensure the following `redirect_uri` is registered in your Shopify Partner Dashboard application settings:
                <code className="block bg-muted/20 p-1 rounded-sm mt-1 text-xs font-mono break-all">
                  https://nojumocxivfjsbqnnkqe.supabase.co/functions/v1/shopify-oauth-callback
                </code>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Future Integrations Placeholder */}
      <Card className="bg-card border-border rounded-lg shadow-sm p-6">
        <CardHeader className="pb-4 flex flex-row items-center gap-4">
          <Plug className="h-6 w-6 text-muted-foreground" />
          <CardTitle className="text-xl font-semibold">Future Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            We're constantly working to bring you more integrations with popular business tools.
            Stay tuned for updates!
          </p>
          <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-1">
            <li>Amazon Seller Central</li>
            <li>Stripe</li>
            <li>And more...</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default Integrations;