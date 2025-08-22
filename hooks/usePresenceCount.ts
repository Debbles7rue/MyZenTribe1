// hooks/usePresence.ts
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/** Passive watcher: subscribe to a presence channel and return how many people are there. */
export function usePresenceCount(topic: string) {
  const [count, setCount] = useState(0);
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const ch = supabase.channel(topic, { config: { presence: { key: "watcher" } } });
    chRef.current = ch;

    const update = () => {
      const state = ch.presenceState() as Record<string, any[]>;
      let total = 0;
      for (const k in state) total += state[k]?.length ?? 0;
      setCount(total);
    };

    ch.on("presence", { event: "sync" }, update);
    ch.subscribe((status) => status === "SUBSCRIBED" && update());

    return () => {
      supabase.removeChannel(ch);
      chRef.current = null;
    };
  }, [topic]);

  return count;
}

/** Active tracker: when `active` is true, advertise this client in the presence channel. */
export function useTrackPresence(topic: string, active: boolean) {
  const tracked = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!active) {
      if (tracked.current) {
        supabase.removeChannel(tracked.current);
        tracked.current = null;
      }
      return;
    }

    const ch = supabase.channel(topic, { config: { presence: { key: "me" } } });
    tracked.current = ch;
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") ch.track({ at: Date.now() });
    });

    return () => {
      supabase.removeChannel(ch);
      tracked.current = null;
    };
  }, [topic, active]);
}
