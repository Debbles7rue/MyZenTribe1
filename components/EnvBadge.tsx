// components/EnvBadge.tsx
"use client";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const ref = (() => {
  try {
    const u = new URL(url);
    // format: https://<ref>.supabase.co
    return u.hostname.split(".")[0] || "unknown";
  } catch {
    return "unknown";
  }
})();

export default function EnvBadge() {
  return (
    <div className="fixed bottom-3 right-3 z-50 rounded-xl bg-black/70 text-white px-3 py-1 text-xs">
      Supabase: <code className="font-mono">{ref}</code>
    </div>
  );
}
