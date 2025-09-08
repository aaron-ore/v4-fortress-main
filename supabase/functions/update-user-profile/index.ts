import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'
// Inlined corsHeaders to avoid module resolution issues
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { targetUserId, newRole, organizationId } = await req.json();

    // Create a Supabase client with the service_role key
    // This client bypasses RLS and can update any profile
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authenticated user's session (the admin making the request)
    const authHeader = req.headers.get('Authorization')!
    const { data: { user: adminUser } } = await supabaseAdmin.auth.getUser(authHeader)

    if (!adminUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin user not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Fetch the admin's profile to verify their role and organization
    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', adminUser.id)
      .single();

    if (adminProfileError || adminProfile?.role !== 'admin' || !adminProfile?.organization_id) {
      console.error('Admin profile error or not an admin:', adminProfileError);
      return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can update user roles.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Fetch the target user's current profile to check their organization
    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', targetUserId)
      .single();

    if (targetProfileError) {
      console.error('Target profile error:', targetProfileError);
      return new Response(JSON.stringify({ error: 'Target user profile not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Authorization check: Admin can only update users within their own organization
    // OR assign an organization to a user with a NULL organization_id (newly invited user)
    if (targetProfile.organization_id !== adminProfile.organization_id && targetProfile.organization_id !== null) {
      return new Response(JSON.stringify({ error: 'Forbidden: Cannot update users outside your organization.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Perform the update using the service_role client
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: newRole,
        organization_id: organizationId, // Ensure organizationId is set/updated
      })
      .eq('id', targetUserId)
      .select('id, full_name, phone, address, avatar_url, role, organization_id, created_at, email, quickbooks_access_token, quickbooks_refresh_token, quickbooks_realm_id') // UPDATED: Select quickbooks_realm_id
      .single();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ profile: updatedProfile }), {
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