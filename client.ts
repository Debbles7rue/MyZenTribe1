// client.ts
"use client";

// Reuse your existing browser client
import { supabase } from "@/lib/supabaseClient";

/** Keeps compatibility with code that does:
 *   import { createClient } from "@/client"
 *   const sb = createClient();
 */
export function createClient() {
  return supabase;
}

/** Also supports:
 *   import supabase from "@/client"
 */
export default supabase;
