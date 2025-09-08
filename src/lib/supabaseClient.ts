import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient;

if (!supabaseUrl) {
  console.error("Supabase URL is missing. Please set VITE_SUPABASE_URL in your .env file.");
  const dummyUrl = "https://dummy.supabase.co";
  const dummyKey = "dummy_anon_key";
  supabase = createClient(dummyUrl, dummyKey);
} else if (!supabaseAnonKey) {
  console.error("Supabase Anon Key is missing. Please set VITE_SUPABASE_ANON_KEY in your .env file.");
  const dummyKey = "dummy_anon_key";
  supabase = createClient(supabaseUrl, dummyKey);
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };