// app/invite/[token]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  params: { token: string };
};

export default function AcceptInvitePage({ params }: Props) {
  const { token } = params;
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "self" | "invalid" | "error">("idle");
  const [details, setDetails] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      setStatus("checking");

      // Must be signed in to accept
      const { data: auth } = await supabase.auth.getSession();
      const session = auth?.session;
      if (!session) {
        // Go sign in and return here
        router.replace(`/login?next=/invite/${token}`);
        return;
      }

      // Call accept RPC
      const { data, error } = await supabase.rpc("accept_friend_invite", {
        p_token: token,
      });

      if (error) {
        console.error(error);
        setStatus("error");
        setDetails(error.message ?? "Something went wrong.");
        return;
      }

      // data should be 'ok' | 'self' | 'invalid'
      if (data === "ok") {
        setStatus("ok");
        setDetails("Friend request created!");
      } else if (data === "self") {
        setStatus("self");
        setDetails("You can't accept your own invite.");
      } else {
        setStatus("invalid");
        setDetails("This invite is invalid or expired.");
      }
    };

    run();
  }, [router, token]);

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold">Add Friend</h1>
      <div className="mt-4 rounded-xl border p-4">
        {status === "checking" && <p>Checking invite…</p>}
        {status === "ok" && (
          <>
            <p className="text-green-700">Success! {details}</p>
            <div className="mt-4 flex gap-2">
              <Link href="/profile" className="px-3 py-2 rounded-lg bg-black/80 text-white text-sm">
                View Profile
              </Link>
              <Link href="/messages" className="px-3 py-2 rounded-lg border text-sm">
                Go to Messages
              </Link>
            </div>
          </>
        )}
        {status === "self" && (
          <>
            <p className="text-amber-700">{details}</p>
            <Link href="/profile" className="mt-4 inline-block px-3 py-2 rounded-lg border text-sm">
              Back to Profile
            </Link>
          </>
        )}
        {status === "invalid" && (
          <>
            <p className="text-red-700">{details}</p>
            <Link href="/profile" className="mt-4 inline-block px-3 py-2 rounded-lg border text-sm">
              Back to Profile
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-red-700">Error: {details}</p>
            <Link href="/profile" className="mt-4 inline-block px-3 py-2 rounded-lg border text-sm">
              Back to Profile
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
