// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const isBrowser = typeof window !== "undefined";

// No-op storage for SSR to avoid touching localStorage on the server.
const serverStorageShim = {
  getItem: (_key: string) => null,
  setItem: (_key: string, _value: string) => {},
  removeItem: (_key: string) => {},
};

// Mobile-friendly, resilient auth settings.
// - persistSession: keep the session in localStorage (browser only)
// - autoRefreshToken: refresh silently in background
// - detectSessionInUrl: complete PKCE on mobile redirects (browser only)
// - flowType: 'pkce' = more reliable on iOS
export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: isBrowser, // only handle callback URLs in browser
    flowType: "pkce",
    storageKey: "myzentribe-auth", // custom key to avoid collisions
    storage: isBrowser ? window.localStorage : (serverStorageShim as any),
  },
});

export default supabase;
