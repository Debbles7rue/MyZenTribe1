import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createClient() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Still return a client shape; callers should handle errors from missing envs
    return createServerClient("https://example.supabase.co", "public-anon-key", {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    });
  }

  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
}
