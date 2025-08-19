"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Minimal profile shape we need for UI
type ProfileLite = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type RequestRow = {
  requester_id: string;
  to_user: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  token?: string | null;
};

export default function FriendsPage() {
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ProfileLite[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileLite>>({});
  const [err, setErr] = useState<string | null>(null);

  // Load my user id
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  // Load my requests + friends
  useEffect(() => {
    if (!me) return;
    (async () => {
      setLoading(true);
      setErr(null);

      // All requests where I'm requester OR recipient
      const { data: reqs, error } = await supabase
        .from("friend_request")
        .select("requester_id,to_user,status,token");
      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }
      setRequests(reqs as RequestRow[]);

      // Collect the "other user" ids to hydrate names/avatars for lists
      const otherIds = new Set<string>();
      (reqs || []).forEach((r) => {
        if (r.requester_id && r.requester_id !== me) otherIds.add(r.requester_id);
        if (r.to_user && r.to_user !== me) otherIds.add(r.to_user);
      });

      if (otherIds.size > 0) {
        const { data: profs, error: pErr } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", Array.from(otherIds));
        if (pErr) setErr(pErr.message);
        const map: Record<string, ProfileLite> = {};
        (profs || []).forEach((p) => (map[p.id] = p as ProfileLite));
        setProfilesById(map);
      } else {
        setProfilesById({});
      }

      setLoading(false);
    })();
  }, [me]);

  // Quick maps for status lookup
  const outgoingPending = useMemo(() => {
    const s = new Set<string>();
    requests.forEach((r) => {
      if (r.status === "pending" && r.requester_id === me) s.add(r.to_user);
    });
    return s;
  }, [requests, me]);

  const incomingPending = useMemo(() => {
    const s = new Set<string>();
    requests.forEach((r) => {
      if (r.status === "pending" && r.to_user === me) s.add(r.requester_id);
    });
    return s;
  }, [requests, me]);

  const friends = useMemo(() => {
    const s = new Set<string>();
    requests.forEach((r) => {
      if (r.status === "accepted") {
        const other = r.requester_id === me ? r.to_user : r.requester_id;
        s.add(other);
      }
    });
    return Array.from(s);
  }, [requests, me]);

  // Search people by name
  async function runSearch() {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    setErr(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .ilike("full_name", `%${search.trim()}%`)
      .limit(25);
    if (error) setErr(error.message);
    setResults((data || []) as ProfileLite[]);
    setSearching(false);
  }

  // Actions
  async function addFriend(targetId: string) {
    if (!me) return;
    const { error } = await supabase.from("friend_request").insert({
      requester_id: me,
      to_user: targetId,
      status: "pending",
    });
    if (error) {
      alert(error.message);
      return;
    }
    // refresh my requests
    refreshRequests();
  }

  async function cancelRequest(targetId: string) {
    if (!me) return;
    const { error } = await supabase
      .from("friend_request")
      .delete()
      .eq("requester_id", me)
      .eq("to_user", targetId)
      .eq("status", "pending");
    if (error) alert(error.message);
    refreshRequests();
  }

  async function acceptRequest(fromId: string) {
    if (!me) return;
    const { error } = await supabase
      .from("friend_request")
      .update({ status: "accepted" })
      .eq("requester_id", fromId)
      .eq("to_user", me)
      .eq("status", "pending");
    if (error) alert(error.message);
    refreshRequests();
  }

  async function declineRequest(fromId: string) {
    if (!me) return;
    const { error } = await supabase
      .from("friend_request")
      .update({ status: "declined" })
      .eq("requester_id", fromId)
      .eq("to_user", me)
      .eq("status", "pending");
    if (error) alert(error.message);
    refreshRequests();
  }

  async function refreshRequests() {
    const { data, error } = await supabase
      .from("friend_request")
      .select("requester_id,to_user,status,token");
    if (error) {
      setErr(error.message);
      return;
    }
    setRequests(data as RequestRow[]);
  }

  // Small helper for rendering an avatar
  function Avatar({ userId, size = 36 }: { userId: string; size?: number }) {
    const p = profilesById[userId];
    const src = p?.avatar_url || "/default-avatar.png";
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={p?.full_name || "User"}
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: 999, objectFit: "cover", border: "1px solid #eee" }}
      />
    );
  }

  return (
    <div className="page-wrap">
      <div className="page">
        <div className="container-app mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>Friends</h1>
          </div>

          <div className="h-px bg-violet-200/60" style={{ margin: "12px 0 16px" }} />

          {err && <div className="note"><div className="note-title">Error</div><div className="note-body">{err}</div></div>}

          {/* Search */}
          <section className="card p-3">
            <h2 className="section-title">Find friends</h2>
            <div className="flex flex-wrap gap-2">
              <input
                className="input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name"
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                style={{ flex: 1, minWidth: 240 }}
              />
              <button className="btn btn-brand" onClick={runSearch} disabled={searching}>
                {searching ? "Searching..." : "Search"}
              </button>
            </div>

            {results.length > 0 && (
              <div className="mt-3 grid gap-2">
                {results
                  .filter((p) => p.id !== me) // hide myself
                  .map((p) => {
                    const isFriend = friends.includes(p.id);
                    const isOutgoing = outgoingPending.has(p.id);
                    const isIncoming = incomingPending.has(p.id);
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-3 border rounded-xl p-2">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.avatar_url || "/default-avatar.png"}
                            alt={p.full_name || "User"}
                            width={36}
                            height={36}
                            style={{ width: 36, height: 36, borderRadius: 999, objectFit: "cover", border: "1px solid #eee" }}
                          />
                          <div className="truncate">{p.full_name || "Member"}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isFriend ? (
                            <span className="badge">Friends</span>
                          ) : isOutgoing ? (
                            <button className="btn" onClick={() => cancelRequest(p.id)}>Cancel request</button>
                          ) : isIncoming ? (
                            <>
                              <button className="btn btn-brand" onClick={() => acceptRequest(p.id)}>Accept</button>
                              <button className="btn" onClick={() => declineRequest(p.id)}>Decline</button>
                            </>
                          ) : (
                            <button className="btn btn-brand" onClick={() => addFriend(p.id)}>Add friend</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>

          {/* Incoming requests */}
          <section className="card p-3 mt-3">
            <h2 className="section-title">Requests</h2>
            <div className="grid gap-2">
              {requests.filter((r) => r.status === "pending" && r.to_user === me).length === 0 ? (
                <p className="muted">No incoming requests.</p>
              ) : (
                requests
                  .filter((r) => r.status === "pending" && r.to_user === me)
                  .map((r) => (
                    <div key={r.requester_id + "->" + r.to_user} className="flex items-center justify-between gap-3 border rounded-xl p-2">
                      <div className="flex items-center gap-3">
                        <Avatar userId={r.requester_id} />
                        <div className="truncate">{profilesById[r.requester_id]?.full_name || "Member"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="btn btn-brand" onClick={() => acceptRequest(r.requester_id)}>Accept</button>
                        <button className="btn" onClick={() => declineRequest(r.requester_id)}>Decline</button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </section>

          {/* Friends list */}
          <section className="card p-3 mt-3">
            <h2 className="section-title">Your friends</h2>
            {friends.length === 0 ? (
              <p className="muted">No friends yet. Search above or share your invite QR/link from your Profile.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {friends.map((fid) => (
                  <div key={fid} className="flex items-center gap-3 border rounded-xl p-2">
                    <Avatar userId={fid} />
                    <div className="truncate">{profilesById[fid]?.full_name || "Member"}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {loading && <p className="muted mt-3">Loading…</p>}
        </div>
      </div>
    </div>
  );
}
