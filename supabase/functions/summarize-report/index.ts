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

  let textToSummarize;

  try {
    console.log('Edge Function: Incoming request method:', req.method);
    console.log('Edge Function: Content-Type header:', req.headers.get('Content-Type'));

    const jsonBody = await req.json();
    textToSummarize = jsonBody.textToSummarize;
    console.log('Edge Function: Extracted textToSummarize (first 100 chars):', textToSummarize ? textToSummarize.substring(0, 100) + '...' : 'null');
    console.log('Edge Function: Length of textToSummarize:', textToSummarize ? textToSummarize.length : 0);

    if (!textToSummarize) {
      console.error('Edge Function: textToSummarize is empty or null after parsing.');
      return new Response(JSON.stringify({ error: 'No text provided for summarization.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create a Supabase client with the service_role key to access secrets and perform admin actions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the Authorization header from the incoming request
    const authHeader = req.headers.get('Authorization');
    console.log('Edge Function: Authorization header received:', authHeader);

    if (!authHeader) {
      console.error('Edge Function: Authorization header missing. Returning 401.');
      return new Response(JSON.stringify({ error: 'Unauthorized: Authorization header missing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Create a new Supabase client using the ANON_KEY and the user's JWT
    // This client will correctly validate the user's session and respect RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Get the authenticated user from the token using the new client
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('Edge Function: User from supabase.auth.getUser():', user);

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

    // Fetch the Gemini API key from Supabase Secrets (using supabaseAdmin as it's an environment variable)
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('Edge Function: Gemini API key not configured. Please ensure GEMINI_API_KEY is set in Supabase Secrets.');
      return new Response(JSON.stringify({ error: 'Gemini API key not configured.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log('Edge Function: Gemini API key is configured.');

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${geminiApiKey}`;
    console.log('Edge Function: Gemini API URL:', GEMINI_API_URL);

    const prompt = `Summarize the following text concisely and accurately. Focus on the key information and main points. The summary should be suitable for a business report or quick overview:\n\n${textToSummarize}`;

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }],
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 64,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error('Edge Function: Gemini API call failed. Status:', geminiResponse.status, 'Status Text:', geminiResponse.statusText);
      console.error('Edge Function: Gemini API error response:', JSON.stringify(errorData, null, 2));
      return new Response(JSON.stringify({ error: `Gemini API error: ${errorData.error?.message || 'Unknown error'}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: geminiResponse.status,
      });
    }

    const geminiData = await geminiResponse.json();
    const summary = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary generated.';

    return new Response(JSON.stringify({ summary }), {
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