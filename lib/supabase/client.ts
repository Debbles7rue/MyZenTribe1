// lib/supabase/client.ts
// Client-side wrapper. Exposes a createClient() function for compatibility.
import { supabase } from "../supabaseClient";

// Some parts of the app import { createClient } from "@/lib/supabase/client"
export function createClient() {
  return supabase;
}

// Also export the raw client (in case other code uses it)
export { supabase };
export default supabase;
