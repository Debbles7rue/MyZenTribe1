// lib/safety.ts
import { supabase } from "@/lib/supabaseClient";

export type SafetyPrefsRow = {
  user_id: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  sos_message: string | null;
  updated_at: string;
};

export async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function getSafetyPrefs(): Promise<{ row: SafetyPrefsRow | null; error: string | null }> {
  const uid = await getUserId();
  if (!uid) return { row: null, error: "Not signed in" };
  const { data, error } = await supabase
    .from("safety_prefs")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle<SafetyPrefsRow>();
  return { row: (data as SafetyPrefsRow) || null, error: error?.message || null };
}

export async function upsertSafetyPrefs(input: {
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  sos_message: string | null;
}) {
  const uid = await getUserId();
  if (!uid) return { ok: false, error: "Not signed in" };

  const { error } = await supabase
    .from("safety_prefs")
    .upsert(
      {
        user_id: uid,
        contact_name: input.contact_name,
        contact_email: input.contact_email,
        contact_phone: input.contact_phone,
        sos_message: input.sos_message,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  return { ok: !error, error: error?.message || null };
}
