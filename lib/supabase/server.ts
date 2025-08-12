// lib/supabase/server.ts
// Server-side wrapper without @supabase/ssr. Keeps the same API names used in your code.
import { supabase } from "../supabaseClient";

// Some parts of the app import { createClient } from "@/lib/supabase/server"
export function createClient() {
  return supabase;
}

// Back-compat: some code may import createServerClient()
export function createServerClient() {
  return supabase;
}

// Optional named/default exports if referenced elsewhere
export { supabase as serverSupabase };
export default supabase;
