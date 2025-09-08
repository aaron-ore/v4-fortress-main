import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
// Inlined corsHeaders to avoid module resolution issues
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { type, record, old_record } = payload; // 'type' is event type (INSERT/UPDATE), 'record' is new data, 'old_record' is old data

    console.log('Edge Function: Received inventory change payload:', JSON.stringify(payload, null, 2));

    if (!record || !record.organization_id) {
      console.error('Edge Function: Missing new record data or organization_id in payload.');
      return new Response(JSON.stringify({ error: 'Missing record data or organization_id.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const organizationId = record.organization_id;

    // Create a Supabase client with the service_role key
    // This client bypasses RLS and can update any profile or fetch any rule
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch active automation rules for this organization
    const { data: rules, error: rulesError } = await supabaseAdmin
      .from('automation_rules')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (rulesError) {
      console.error('Edge Function: Error fetching automation rules:', rulesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch automation rules.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!rules || rules.length === 0) {
      console.log('Edge Function: No active automation rules found for organization:', organizationId);
      return new Response(JSON.stringify({ message: 'No active automation rules to process.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const processedActions = [];

    for (const rule of rules) {
      console.log(`Edge Function: Evaluating rule: ${rule.name} (ID: ${rule.id})`);

      let triggerMatched = false;
      let conditionMet = false;

      // --- Trigger Evaluation ---
      if (rule.trigger_type === 'ON_STOCK_LEVEL_CHANGE' && type === 'UPDATE') {
        // Only process if stock quantity actually changed
        if (old_record && old_record.quantity !== record.quantity) {
          triggerMatched = true;
          console.log(`Edge Function: Trigger 'ON_STOCK_LEVEL_CHANGE' matched for item ${record.name}.`);
        }
      }
      // Add other trigger evaluations here in future phases

      if (!triggerMatched) {
        console.log(`Edge Function: Rule ${rule.name} - Trigger not matched.`);
        continue;
      }

      // --- Condition Evaluation ---
      if (rule.condition_json) {
        // For this phase, only support 'quantity drops below X'
        if (rule.condition_json.field === 'quantity' && rule.condition_json.operator === 'lt') {
          const threshold = rule.condition_json.value;
          if (record.quantity < threshold) {
            conditionMet = true;
            console.log(`Edge Function: Rule ${rule.name} - Condition 'quantity < ${threshold}' met (current: ${record.quantity}).`);
          } else {
            console.log(`Edge Function: Rule ${rule.name} - Condition 'quantity < ${threshold}' NOT met (current: ${record.quantity}).`);
          }
        }
        // Add other condition evaluations here in future phases
      } else {
        // If no conditions are defined, it's always met
        conditionMet = true;
        console.log(`Edge Function: Rule ${rule.name} - No conditions defined, condition met by default.`);
      }

      if (!conditionMet) {
        console.log(`Edge Function: Rule ${rule.name} - Condition not met. Skipping action.`);
        continue;
      }

      // --- Action Execution ---
      if (rule.action_json) {
        if (rule.action_json.type === 'SEND_NOTIFICATION') {
          let message = rule.action_json.message;
          // Replace placeholders
          message = message.replace(/{itemName}/g, record.name || 'N/A');
          message = message.replace(/{sku}/g, record.sku || 'N/A');
          message = message.replace(/{quantity}/g, record.quantity !== undefined ? String(record.quantity) : 'N/A');
          message = message.replace(/{oldQuantity}/g, old_record?.quantity !== undefined ? String(old_record.quantity) : 'N/A');
          message = message.replace(/{location}/g, record.location || 'N/A');

          // Log to activity_logs table (which NotificationContext listens to)
          const { error: logError } = await supabaseAdmin
            .from('activity_logs')
            .insert({
              user_id: rule.user_id, // Use the user who created the rule, or a system user
              organization_id: organizationId,
              activity_type: "Automation Notification",
              description: message,
              details: {
                rule_id: rule.id,
                rule_name: rule.name,
                item_id: record.id,
                item_name: record.name,
                sku: record.sku,
                current_quantity: record.quantity,
                old_quantity: old_record?.quantity,
                location: record.location,
              },
            });

          if (logError) {
            console.error('Edge Function: Error logging automation notification:', logError);
            processedActions.push({ ruleId: rule.id, action: 'SEND_NOTIFICATION', status: 'failed', error: logError.message });
          } else {
            console.log(`Edge Function: Rule ${rule.name} - Notification sent: "${message}"`);
            processedActions.push({ ruleId: rule.id, action: 'SEND_NOTIFICATION', status: 'success', message });
          }
        }
        // Add other action executions here in future phases
      }
    }

    return new Response(JSON.stringify({ message: 'Automation rules processed.', results: processedActions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Edge Function error during request processing:', error);
    return new Response(JSON.stringify({ error: `Failed to process request: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});