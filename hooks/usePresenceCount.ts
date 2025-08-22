// hooks/usePresenceCount.ts
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function usePresenceCount(channelName: string) {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const channel = supabase.channel(channelName, {
      config: { presence: { key: Math.random().toString(36).slice(2) } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      // state is { [presenceKey]: [{...payload}] }
      const total = Object.values(state).reduce((n, arr) => n + (arr as any[]).length, 0);
      setCount(total);
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.track({ });
      }
    });

    return () => { supabase.removeChannel(channel); };
  }, [channelName]);

  return count;
}
