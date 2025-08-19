// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Mobile-friendly, resilient auth settings.
// - persistSession: keep the session in localStorage
// - autoRefreshToken: refresh silently in background
// - detectSessionInUrl: complete PKCE on mobile redirects
// - flowType: 'pkce' = more reliable on iOS
export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    storageKey: "myzentribe-auth", // custom key to avoid collisions
  },
});

export default supabase;
