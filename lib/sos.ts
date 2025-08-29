// lib/sos.ts
import { supabase } from "@/lib/supabaseClient";

export type EmergencySettings = {
  emergency_contact_name: string | null;
  emergency_contact_method: "sms" | "email" | null;
  emergency_contact_value: string | null;
  sos_enabled: boolean;
};

const DEFAULTS: EmergencySettings = {
  emergency_contact_name: null,
  emergency_contact_method: null,
  emergency_contact_value: null,
  sos_enabled: false,
};

export async function getEmergencySettings(): Promise<EmergencySettings> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return DEFAULTS;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("emergency_contact_name, emergency_contact_method, emergency_contact_value, sos_enabled")
      .eq("id", user.id)
      .maybeSingle();
    if (error || !data) return DEFAULTS;

    return {
      emergency_contact_name: data.emergency_contact_name ?? null,
      emergency_contact_method: (data.emergency_contact_method ?? null) as any,
      emergency_contact_value: data.emergency_contact_value ?? null,
      sos_enabled: !!data.sos_enabled,
    };
  } catch {
    // Columns may not exist yet — return defaults silently.
    return DEFAULTS;
  }
}

export async function saveEmergencySettings(patch: Partial<EmergencySettings>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return { ok: false, error: "Not signed in" };

  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        emergency_contact_name: patch.emergency_contact_name ?? null,
        emergency_contact_method: patch.emergency_contact_method ?? null,
        emergency_contact_value: patch.emergency_contact_value ?? null,
        sos_enabled: !!patch.sos_enabled,
      })
      .eq("id", user.id);
    return { ok: !error, error: error?.message || null };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Update failed" };
  }
}
