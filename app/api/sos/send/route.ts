// /app/api/sos/send/route.ts (example)
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookies().get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // …build notification payload…
  const { error: insertErr } = await supabase
    .from("notifications")
    .insert({
      user_id: user.id,           // ✅ never null
      type: "sos_test",
      title: "SOS test prepared",
      body: "We prepared an SOS test message.",
      link: null,
    });

  if (insertErr) return new Response(insertErr.message, { status: 400 });
  return new Response("ok");
}
