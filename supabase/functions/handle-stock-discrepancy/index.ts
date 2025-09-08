import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { item_id, location_string, location_type, physical_count, reason } = await req.json();

    if (!item_id || !location_string || !location_type || physical_count === undefined || physical_count === null) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: item_id, location_string, location_type, physical_count.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create a Supabase client with the service_role key
    // This client bypasses RLS and can update any profile
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authenticated user's session
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: User not authenticated.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Fetch user's profile to get organization_id
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('Profile fetch error or missing organization_id:', profileError);
      return new Response(JSON.stringify({ error: 'User profile or organization ID not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const organization_id = userProfile.organization_id;
    const userName = userProfile.full_name || user.email;

    // 1. Fetch the original_quantity for the given item_id and location_type
    const { data: itemData, error: itemError } = await supabaseAdmin
      .from('inventory_items')
      .select('name, picking_bin_quantity, overstock_quantity')
      .eq('id', item_id)
      .eq('organization_id', organization_id)
      .single();

    if (itemError || !itemData) {
      console.error('Error fetching inventory item:', itemError);
      return new Response(JSON.stringify({ error: 'Inventory item not found or access denied.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    let original_quantity: number;
    let updatePayload: { picking_bin_quantity?: number; overstock_quantity?: number };

    if (location_type === 'picking_bin') {
      original_quantity = itemData.picking_bin_quantity;
      updatePayload = { picking_bin_quantity: physical_count };
    } else if (location_type === 'overstock') {
      original_quantity = itemData.overstock_quantity;
      updatePayload = { overstock_quantity: physical_count };
    } else {
      return new Response(JSON.stringify({ error: 'Invalid location_type provided.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 2. Conditional Check: If physical_count is NOT equal to original_quantity
    if (physical_count !== original_quantity) {
      const difference = physical_count - original_quantity;

      // 3. Create Discrepancy Record
      const { data: discrepancyData, error: discrepancyError } = await supabaseAdmin
        .from('discrepancies')
        .insert({
          item_id: item_id,
          location_string: location_string,
          location_type: location_type,
          original_quantity: original_quantity,
          counted_quantity: physical_count,
          difference: difference,
          reason: reason || 'Cycle Count Adjustment',
          status: 'pending',
          user_id: user.id,
          organization_id: organization_id,
        })
        .select()
        .single();

      if (discrepancyError) {
        console.error('Error inserting discrepancy:', discrepancyError);
        return new Response(JSON.stringify({ error: 'Failed to record discrepancy.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      // 4. Update Inventory
      const { error: updateInventoryError } = await supabaseAdmin
        .from('inventory_items')
        .update(updatePayload)
        .eq('id', item_id)
        .eq('organization_id', organization_id);

      if (updateInventoryError) {
        console.error('Error updating inventory item quantity:', updateInventoryError);
        // Potentially revert discrepancy record or mark as failed
        return new Response(JSON.stringify({ error: 'Failed to update inventory quantity.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      // 5. Alert: Trigger an in-app notification
      // This is a simplified notification. In a real app, you might have a dedicated notifications table
      // or a more robust system. For now, we'll log to activity_logs and rely on frontend polling/realtime.
      const notificationMessage = `Stock Discrepancy: ${itemData.name} (${itemData.sku}) at ${location_string} (${location_type}). Counted: ${physical_count}, System: ${original_quantity}. Difference: ${difference}. Reported by ${userName}.`;

      await supabaseAdmin
        .from('activity_logs')
        .insert({
          user_id: user.id,
          organization_id: organization_id,
          activity_type: "Stock Discrepancy",
          description: notificationMessage,
          details: {
            discrepancy_id: discrepancyData.id,
            item_id: item_id,
            item_name: itemData.name,
            sku: itemData.sku,
            location_string: location_string,
            location_type: location_type,
            original_quantity: original_quantity,
            counted_quantity: physical_count,
            difference: difference,
            reason: reason,
            reported_by: userName,
          },
        });

      return new Response(JSON.stringify({
        message: 'Discrepancy recorded and inventory updated.',
        discrepancy: discrepancyData,
        notification: notificationMessage,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      return new Response(JSON.stringify({ message: 'No discrepancy detected. Quantities match.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});