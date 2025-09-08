import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('Full incoming request URL:', req.url);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');
    const realmIdFromUrl = url.searchParams.get('realmId'); // Check URL parameters first

    console.log('QuickBooks OAuth Callback: All URL search parameters:', JSON.stringify(Object.fromEntries(url.searchParams.entries()), null, 2));

    let userId: string | null = null;
    let redirectToFrontend: string | null = null;
    const FALLBACK_CLIENT_APP_BASE_URL = 'https://dyad-generated-app.vercel.app';

    if (state) {
      try {
        const decodedState = JSON.parse(atob(state));
        userId = decodedState.userId;
        redirectToFrontend = decodedState.redirectToFrontend;
        console.log('QuickBooks OAuth Callback: Decoded state - userId:', userId, 'redirectToFrontend:', redirectToFrontend);
      } catch (e) {
        console.error('Error decoding state parameter:', e);
      }
    }
    const finalRedirectBase = redirectToFrontend || FALLBACK_CLIENT_APP_BASE_URL;

    if (error) {
      console.error('QuickBooks OAuth Error:', error, errorDescription);
      return Response.redirect(`${finalRedirectBase}/quickbooks-oauth-callback?quickbooks_error=${encodeURIComponent(errorDescription || error)}`, 302);
    }

    if (!code || !userId) {
      console.error('Missing authorization code or userId in QuickBooks OAuth callback.');
      return Response.redirect(`${finalRedirectBase}/quickbooks-oauth-callback?quickbooks_error=${encodeURIComponent('Missing authorization code or user ID.')}`, 302);
    }

    const QUICKBOOKS_CLIENT_ID = Deno.env.get('QUICKBOOKS_CLIENT_ID');
    const QUICKBOOKS_CLIENT_SECRET = Deno.env.get('QUICKBOOKS_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!QUICKBOOKS_CLIENT_ID || !QUICKBOOKS_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase or QuickBooks environment variables.');
      return Response.redirect(`${finalRedirectBase}/quickbooks-oauth-callback?quickbooks_error=${encodeURIComponent('Server configuration error: Missing environment variables.')}`, 302);
    }

    const redirectUri = `https://nojumocxivfjsbqnnkqe.supabase.co/functions/v1/quickbooks-oauth-callback`;
    console.log('Using redirectUri for token exchange:', redirectUri);

    const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': `Basic ${btoa(`${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Error exchanging QuickBooks code for tokens:', errorData);
      return Response.redirect(`${finalRedirectBase}/quickbooks-oauth-callback?quickbooks_error=${encodeURIComponent(errorData.error_description || 'Failed to get QuickBooks tokens.')}`, 302);
    }

    const tokens = await tokenResponse.json();
    console.log('QuickBooks OAuth Callback: Full tokens object received:', JSON.stringify(tokens, null, 2));

    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;

    let finalRealmId: string | null = realmIdFromUrl; // Start with realmId from URL

    console.log('QuickBooks OAuth Callback: Received Realm ID (from URL parameters):', realmIdFromUrl || 'null (missing from URL)');
    // Log tokens.id_token directly (expected to be null with response_type="code")
    console.log('QuickBooks OAuth Callback: tokens.id_token value:', tokens.id_token || 'null (not present in token response)');

    // If realmId is still not found, try fetching from userinfo endpoint
    if (!finalRealmId && accessToken) {
      console.log('QuickBooks OAuth Callback: Realm ID not found in URL. Attempting to fetch from userinfo endpoint...');
      try {
        const userinfoResponse = await fetch('https://sandbox-accounts.platform.intuit.com/v1/openid_connect/userinfo', { // Use sandbox for testing, or production URL
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        });

        if (!userinfoResponse.ok) {
          const userinfoErrorData = await userinfoResponse.json();
          console.error('Error fetching userinfo from QuickBooks:', userinfoErrorData);
          // Don't fail the whole flow, just log and proceed without realmId
        } else {
          const userinfo = await userinfoResponse.json();
          console.log('QuickBooks OAuth Callback: Userinfo response:', JSON.stringify(userinfo, null, 2));
          finalRealmId = userinfo.sub || null; // 'sub' field often contains realmId or a unique identifier
          // NOTE: Intuit's userinfo endpoint might return 'sub' as the user ID, not realmId.
          // The realmId is typically found in the 'id_token' or the redirect URL.
          // Given the previous logs, the 'id_token' *did* contain realmId when response_type was 'code id_token'.
          // Let's re-evaluate if 'id_token' is *ever* present with 'code' and 'openid' scope.
          // If not, we might need to parse the 'id_token' from the *initial* token response if it's there.
          // For now, let's assume 'sub' might contain it or we need to re-enable 'id_token' in response_type.

          // Re-checking Intuit docs: realmId is in id_token. If response_type is 'code', id_token is NOT returned.
          // So, the userinfo endpoint is the correct place to get user details, but realmId is not directly there.
          // The 'sub' field is the user's unique identifier.
          // The realmId is the company ID.

          // Let's try to get the company info directly if realmId is still null
          if (!finalRealmId) {
            console.log('QuickBooks OAuth Callback: Realm ID still not found. Attempting to fetch company info...');
            try {
              const companyInfoResponse = await fetch(`https://quickbooks.api.intuit.com/v3/company/${userinfo.realmId}/companyinfo/${userinfo.realmId}?minorversion=69`, { // This requires realmId
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Accept': 'application/json',
                },
              });
              if (companyInfoResponse.ok) {
                const companyInfo = await companyInfoResponse.json();
                finalRealmId = companyInfo.CompanyInfo.Id;
                console.log('QuickBooks OAuth Callback: Realm ID from CompanyInfo API:', finalRealmId);
              } else {
                console.warn('QuickBooks OAuth Callback: Failed to fetch company info.');
              }
            } catch (e) {
              console.error('QuickBooks OAuth Callback: Error fetching company info:', e);
            }
          }
        }
      } catch (e) {
        console.error('QuickBooks OAuth Callback: Error fetching userinfo:', e);
      }
    }

    console.log('QuickBooks OAuth Callback: Final Realm ID to be stored:', finalRealmId || 'null');

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: updatedProfileData, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        quickbooks_access_token: accessToken,
        quickbooks_refresh_token: refreshToken,
        quickbooks_realm_id: finalRealmId,
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user profile with QuickBooks tokens:', updateError);
      console.error('QuickBooks OAuth Callback: Profile update error details:', JSON.stringify(updateError, null, 2));
      return Response.redirect(`${finalRedirectBase}/quickbooks-oauth-callback?quickbooks_error=${encodeURIComponent('Failed to save QuickBooks tokens.')}`, 302);
    }

    console.log('QuickBooks OAuth Callback: Profile updated successfully. Data returned:', JSON.stringify(updatedProfileData, null, 2));

    console.log('QuickBooks tokens and Realm ID successfully stored for user:', userId);
    return Response.redirect(`${finalRedirectBase}/quickbooks-oauth-callback?quickbooks_success=true&realmId_present=${!!finalRealmId}`, 302);
  } catch (error) {
    console.error('QuickBooks OAuth callback Edge Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});