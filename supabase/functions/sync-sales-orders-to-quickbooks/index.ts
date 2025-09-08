import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

// Inlined corsHeaders to avoid module resolution issues
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    console.log('Edge Function received Authorization header:', authHeader);

    if (!authHeader) {
      console.error('Edge Function: Authorization header missing. Returning 401.');
      return new Response(JSON.stringify({ error: 'Unauthorized: Authorization header missing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.error('Edge Function: JWT token missing from Authorization header. Returning 401.');
      return new Response(JSON.stringify({ error: 'Unauthorized: JWT token missing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('Edge Function user from auth.getUser:', user);

    if (userError) {
      console.error('Edge Function: Error getting user from token:', userError);
      return new Response(JSON.stringify({ error: `Unauthorized: ${userError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    if (!user) {
      console.error('Edge Function: User not authenticated from token. Returning 401.');
      return new Response(JSON.stringify({ error: 'Unauthorized: User not authenticated.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('quickbooks_access_token, quickbooks_refresh_token, quickbooks_realm_id')
      .eq('id', user.id)
      .single();

    console.log('Edge Function: Fetched profile for user:', user.id, 'Profile data:', profile);

    if (profileError || !profile?.quickbooks_access_token || !profile?.quickbooks_refresh_token || !profile?.quickbooks_realm_id) {
      console.error('QuickBooks credentials missing for user:', user.id, profileError);
      const errorMessage = !profile?.quickbooks_realm_id 
        ? 'QuickBooks company (realmId) is missing. Please re-connect QuickBooks and ensure you select a company during authorization.'
        : 'QuickBooks integration not fully set up for this user (tokens or realmId missing).';
      return new Response(JSON.stringify({ error: errorMessage }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    let accessToken = profile.quickbooks_access_token;
    let refreshToken = profile.quickbooks_refresh_token;
    const realmId = profile.quickbooks_realm_id;

    const QUICKBOOKS_CLIENT_ID = Deno.env.get('QUICKBOOKS_CLIENT_ID');
    const QUICKBOOKS_CLIENT_SECRET = Deno.env.get('QUICKBOOKS_CLIENT_SECRET');
    const QUICKBOOKS_ENVIRONMENT = Deno.env.get('QUICKBOOKS_ENVIRONMENT') || 'sandbox'; // 'sandbox' or 'production'

    if (!QUICKBOOKS_CLIENT_ID || !QUICKBOOKS_CLIENT_SECRET) {
      return new Response(JSON.stringify({ error: 'QuickBooks API credentials (Client ID/Secret) are missing in Supabase secrets.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const QUICKBOOKS_API_BASE_URL = QUICKBOOKS_ENVIRONMENT === 'production'
      ? 'https://quickbooks.api.intuit.com/v3/company'
      : 'https://sandbox-quickbooks.api.intuit.com/v3/company';

    const refreshQuickBooksToken = async () => {
      console.log('Refreshing QuickBooks token...');
      const refreshResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'Authorization': `Basic ${btoa(`${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }).toString(),
      });

      if (!refreshResponse.ok) {
        const errorData = await refreshResponse.json();
        console.error('Error refreshing QuickBooks token:', errorData);
        throw new Error(`Failed to refresh QuickBooks token: ${errorData.error_description || 'Unknown error'}`);
      }

      const newTokens = await refreshResponse.json();
      accessToken = newTokens.access_token;
      refreshToken = newTokens.refresh_token;

      const { error: updateTokenError } = await supabaseAdmin
        .from('profiles')
        .update({
          quickbooks_access_token: accessToken,
          quickbooks_refresh_token: refreshToken,
        })
        .eq('id', user.id);

      if (updateTokenError) {
        console.error('Error saving new QuickBooks tokens to profile:', updateTokenError);
        throw new Error('Failed to save new QuickBooks tokens.');
      }
      console.log('QuickBooks token refreshed and saved.');
    };

    const makeQuickBooksApiCall = async (url: string, options: RequestInit, retryOnAuth = true) => {
      let response = await fetch(url, options);

      if (response.status === 401 && retryOnAuth) {
        console.log('QuickBooks API call failed with 401, attempting token refresh...');
        await refreshQuickBooksToken();
        options.headers = { ...options.headers, 'Authorization': `Bearer ${accessToken}` };
        response = await fetch(url, options);
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`QuickBooks API error for URL ${url}:`, errorData);
        throw new Error(`QuickBooks API error: ${errorData.Fault?.Error?.[0]?.Detail || response.statusText}`);
      }
      return response.json();
    };

    const getOrCreateQuickBooksCustomer = async (customerName: string, customerEmail?: string) => {
      // Search for customer
      const queryUrl = `${QUICKBOOKS_API_BASE_URL}/${realmId}/query?query=${encodeURIComponent(`SELECT * FROM Customer WHERE DisplayName = '${customerName}'`)}&minorversion=69`;
      const searchResult = await makeQuickBooksApiCall(queryUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (searchResult.QueryResponse.Customer && searchResult.QueryResponse.Customer.length > 0) {
        console.log(`Found existing QuickBooks customer: ${customerName} (ID: ${searchResult.QueryResponse.Customer[0].Id})`);
        return searchResult.QueryResponse.Customer[0].Id;
      }

      // Create new customer if not found
      console.log(`QuickBooks customer ${customerName} not found, creating new...`);
      const newCustomerPayload = {
        DisplayName: customerName,
        PrimaryEmailAddr: customerEmail ? { Address: customerEmail } : undefined,
      };
      const createUrl = `${QUICKBOOKS_API_BASE_URL}/${realmId}/customer?minorversion=69`;
      const createResult = await makeQuickBooksApiCall(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCustomerPayload),
      });
      console.log(`Created new QuickBooks customer: ${customerName} (ID: ${createResult.Customer.Id})`);
      return createResult.Customer.Id;
    };

    // NEW: Function to get a suitable Income Account ID
    const getQuickBooksIncomeAccountId = async () => {
      // Try to find a 'Sales' or 'Services' income account
      const querySalesAccountUrl = `${QUICKBOOKS_API_BASE_URL}/${realmId}/query?query=${encodeURIComponent(`SELECT * FROM Account WHERE AccountType = 'Income' AND Name = 'Sales'`)}&minorversion=69`;
      const queryServicesAccountUrl = `${QUICKBOOKS_API_BASE_URL}/${realmId}/query?query=${encodeURIComponent(`SELECT * FROM Account WHERE AccountType = 'Income' AND Name = 'Services'`)}&minorversion=69`;

      let salesAccountResult = await makeQuickBooksApiCall(querySalesAccountUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (salesAccountResult.QueryResponse.Account && salesAccountResult.QueryResponse.Account.length > 0) {
        console.log(`Found existing QuickBooks Income Account 'Sales' (ID: ${salesAccountResult.QueryResponse.Account[0].Id})`);
        return salesAccountResult.QueryResponse.Account[0].Id;
      }

      let servicesAccountResult = await makeQuickBooksApiCall(queryServicesAccountUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (servicesAccountResult.QueryResponse.Account && servicesAccountResult.QueryResponse.Account.length > 0) {
        console.log(`Found existing QuickBooks Income Account 'Services' (ID: ${servicesAccountResult.QueryResponse.Account[0].Id})`);
        return servicesAccountResult.QueryResponse.Account[0].Id;
      }

      // If no specific 'Sales' or 'Services' account found, try to find any Income account
      const queryAnyIncomeAccountUrl = `${QUICKBOOKS_API_BASE_URL}/${realmId}/query?query=${encodeURIComponent(`SELECT * FROM Account WHERE AccountType = 'Income' MAXRESULTS 1`)}&minorversion=69`;
      let anyIncomeAccountResult = await makeQuickBooksApiCall(queryAnyIncomeAccountUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (anyIncomeAccountResult.QueryResponse.Account && anyIncomeAccountResult.QueryResponse.Account.length > 0) {
        console.log(`Found generic QuickBooks Income Account '${anyIncomeAccountResult.QueryResponse.Account[0].Name}' (ID: ${anyIncomeAccountResult.QueryResponse.Account[0].Id})`);
        return anyIncomeAccountResult.QueryResponse.Account[0].Id;
      }

      throw new Error("No suitable Income Account found in QuickBooks. Please ensure you have an 'Income' type account (e.g., 'Sales' or 'Services') configured in your QuickBooks company.");
    };

    const getOrCreateQuickBooksItem = async (itemName: string, unitPrice: number) => {
      // Search for item
      const queryUrl = `${QUICKBOOKS_API_BASE_URL}/${realmId}/query?query=${encodeURIComponent(`SELECT * FROM Item WHERE Name = '${itemName}'`)}&minorversion=69`;
      const searchResult = await makeQuickBooksApiCall(queryUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (searchResult.QueryResponse.Item && searchResult.QueryResponse.Item.length > 0) {
        console.log(`Found existing QuickBooks item: ${itemName} (ID: ${searchResult.QueryResponse.Item[0].Id})`);
        return searchResult.QueryResponse.Item[0].Id;
      }

      // If not found, create new service item
      console.log(`QuickBooks item ${itemName} not found, creating new service item...`);

      const incomeAccountId = await getQuickBooksIncomeAccountId(); // Get the account ID

      const newItemPayload = {
        Name: itemName,
        Type: 'Service',
        Active: true,
        UnitPrice: unitPrice,
        IncomeAccountRef: {
          value: incomeAccountId, // Use the fetched ID
        },
      };
      const createUrl = `${QUICKBOOKS_API_BASE_URL}/${realmId}/item?minorversion=69`;
      const createResult = await makeQuickBooksApiCall(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newItemPayload),
      });
      console.log(`Created new QuickBooks item: ${itemName} (ID: ${createResult.Item.Id})`);
      return createResult.Item.Id;
    };

    const { data: ordersToSync, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('type', 'Sales')
      .eq('status', 'Shipped')
      .is('quickbooks_synced', false);

    if (ordersError) {
      console.error('Error fetching orders to sync:', ordersError);
      return new Response(JSON.stringify({ error: 'Failed to fetch sales orders.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!ordersToSync || ordersToSync.length === 0) {
      return new Response(JSON.stringify({ message: 'No new shipped sales orders to sync to QuickBooks.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const syncResults = [];

    for (const order of ordersToSync) {
      try {
        console.log(`Processing order ${order.id} for QuickBooks sync...`);

        // 1. Get or Create Customer in QuickBooks
        const customerId = await getOrCreateQuickBooksCustomer(order.customer_supplier, order.customer_email); // Assuming customer_email might be available

        // 2. Get or Create Items in QuickBooks
        const qbLineItems = [];
        for (const item of order.items) {
          const qbItemId = await getOrCreateQuickBooksItem(item.itemName, item.unitPrice);
          qbLineItems.push({
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: {
              ItemRef: {
                value: qbItemId,
                name: item.itemName,
              },
              UnitPrice: item.unitPrice,
              Qty: item.quantity,
            },
            Amount: item.quantity * item.unitPrice,
          });
        }

        // 3. Create SalesReceipt in QuickBooks
        const salesReceipt = {
          CustomerRef: {
            value: customerId,
            name: order.customer_supplier,
          },
          Line: qbLineItems,
          TxnDate: order.date,
          PrivateNote: `Fortress Order ID: ${order.id}. Notes: ${order.notes || ''}`,
          TotalAmt: order.total_amount,
        };

        console.log(`Creating SalesReceipt in QuickBooks for order ${order.id} with payload:`, JSON.stringify(salesReceipt, null, 2));
        const qbData = await makeQuickBooksApiCall(`${QUICKBOOKS_API_BASE_URL}/${realmId}/salesreceipt?minorversion=69`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(salesReceipt),
        });
        const quickbooksId = qbData.SalesReceipt.Id;
        console.log(`SalesReceipt created in QuickBooks for order ${order.id}. QuickBooks ID: ${quickbooksId}`);

        // 4. Update Supabase order status
        const { error: updateOrderError } = await supabaseAdmin
          .from('orders')
          .update({
            quickbooks_synced: true,
            quickbooks_id: quickbooksId,
          })
          .eq('id', order.id);

        if (updateOrderError) {
          console.error(`Error updating Supabase order ${order.id} after QuickBooks sync:`, updateOrderError);
          throw new Error('Failed to update order sync status in Supabase.');
        }

        syncResults.push({ orderId: order.id, status: 'success', quickbooksId });

      } catch (syncError: any) {
        console.error(`Error syncing order ${order.id}:`, syncError);
        syncResults.push({ orderId: order.id, status: 'failed', error: syncError.message });
      }
    }

    return new Response(JSON.stringify({ message: 'Sales order synchronization complete.', results: syncResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});