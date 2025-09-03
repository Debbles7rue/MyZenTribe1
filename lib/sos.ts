// lib/sos.ts
import { supabase } from "@/lib/supabaseClient";

export type EmergencySettings = {
  emergency_contact_name: string | null;
  emergency_contact_method: "sms" | "email" | null;
  emergency_contact_value: string | null;
  emergency_message: string | null;
  user_phone: string | null;
  sos_enabled: boolean;
  alert_interval?: number;
  check_in_timer?: number;
  stealth_mode?: boolean;
  severity_level?: 'low' | 'medium' | 'high';
  secondary_contact_name?: string | null;
  secondary_contact_value?: string | null;
};

const DEFAULTS: EmergencySettings = {
  emergency_contact_name: null,
  emergency_contact_method: null,
  emergency_contact_value: null,
  emergency_message: 'I am uncomfortable at this event/location. Please check on me. My location is:',
  user_phone: null,
  sos_enabled: false,
  alert_interval: 0,
  check_in_timer: 0,
  stealth_mode: false,
  severity_level: 'medium',
  secondary_contact_name: null,
  secondary_contact_value: null,
};

export async function getEmergencySettings(): Promise<EmergencySettings> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return DEFAULTS;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("emergency_contact_name, emergency_contact_method, emergency_contact_value, sos_enabled, emergency_message, user_phone, alert_interval, check_in_timer, stealth_mode, severity_level, secondary_contact_name, secondary_contact_value")
      .eq("id", user.id)
      .maybeSingle();
    if (error || !data) return DEFAULTS;

    return {
      emergency_contact_name: data.emergency_contact_name ?? null,
      emergency_contact_method: (data.emergency_contact_method ?? null) as any,
      emergency_contact_value: data.emergency_contact_value ?? null,
      emergency_message: data.emergency_message ?? DEFAULTS.emergency_message,
      user_phone: data.user_phone ?? null,
      sos_enabled: !!data.sos_enabled,
      alert_interval: data.alert_interval ?? 0,
      check_in_timer: data.check_in_timer ?? 0,
      stealth_mode: !!data.stealth_mode,
      severity_level: data.severity_level ?? 'medium',
      secondary_contact_name: data.secondary_contact_name ?? null,
      secondary_contact_value: data.secondary_contact_value ?? null,
    };
  } catch {
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
        emergency_message: patch.emergency_message ?? null,
        user_phone: patch.user_phone ?? null,
        sos_enabled: !!patch.sos_enabled,
        alert_interval: patch.alert_interval ?? 0,
        check_in_timer: patch.check_in_timer ?? 0,
        stealth_mode: !!patch.stealth_mode,
        severity_level: patch.severity_level ?? 'medium',
        secondary_contact_name: patch.secondary_contact_name ?? null,
        secondary_contact_value: patch.secondary_contact_value ?? null,
      })
      .eq("id", user.id);
    return { ok: !error, error: error?.message || null };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Update failed" };
  }
}
