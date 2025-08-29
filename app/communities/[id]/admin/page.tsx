"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Member = {
  user_id: string;
  role: "member" | "admin" | "owner";
  created_at: string;
  profile?: { id: string; full_name: string | null; avatar_url: string | null };
};

export default function CommunityAdminPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const communityId = params?.id;

  const [me, setMe] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [targetUserId, setTargetUserId] = useState("");

  const myRole = useMemo(() => {
    const r = members.find(m => m.user_id === me)?.role;
    return (r as Member["role"]) || null;
  }, [members, me]);

  const isAdmin = useMemo(() => myRole === "owner" || myRole === "admin", [myRole]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace(`/login?next=${encodeURIComponent(`/communities/${communityId}/admin`)}`);
        return;
      }
      setMe(data.user.id);
    })();
  }, [communityId, router]);

  async function loadMembers() {
    if (!communityId) return;
    setLoading(true);
    setErr(null);
    try {
      // Join profiles (id, full_name, avatar_url)
      const { data, error } = await supabase
        .from("community_members")
        .select(`
          user_id,
          role,
          created_at,
          profile:profiles!community_members_user_id_fkey ( id, full_name, avatar_url )
        `)
        .eq("community_id", communityId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const rows: Member[] = (data || []).map((r: any) => ({
        user_id: r.user_id,
        role: r.role,
        created_at: r.created_at,
        profile: r.profile,
      }));
      setMembers(rows);
    } catch (e: any) {
      setErr(e?.message || "Could not load members");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (me) loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, communityId]);

  async function addMember(userId: string, role: "member" | "admin" = "member") {
    if (!communityId || !userId) return;
    const { error } = await supabase
      .from("community_members")
      .upsert({ community_id: communityId, user_id: userId, role }, { onConflict: "community_id,user_id" });
    if (error) { alert(error.message); return; }
    setTargetUserId("");
    loadMembers();
  }
  async function setRole(userId: string, role: "member" | "admin") {
    if (!communityId || !userId) return;
    const { error } = await supabase
      .from("community_members")
      .update({ role })
      .eq("community_id", communityId)
      .eq("user_id", userId);
    if (error) { alert(error.message); return; }
    loadMembers();
  }
  async function removeMember(userId: string) {
    if (!communityId || !userId) return;
    const { error } = await supabase
      .from("community_members")
      .delete()
      .eq("community_id", communityId)
      .eq("user_id", userId);
    if (error) { alert(error.message); return; }
    loadMembers();
  }

  if (!communityId) return null;

  return (
    <main className="min-h-screen p-6" style={{ background: "#F4ECFF" }}>
      <div className="mx-auto max-w-4xl rounded-2xl border border-purple-100 bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Community Admin</h1>
          <button className="btn" onClick={() => router.push(`/communities/${communityId}`)}>
            Back to community
          </button>
        </div>

        {!isAdmin ? (
          <p className="mt-4 text-rose-600">
            You must be an admin to view this page.
          </p>
        ) : loading ? (
          <p className="mt-4">Loading…</p>
        ) : err ? (
          <p className="mt-4 text-rose-600">Error: {err}</p>
        ) : (
          <>
            <div className="mt-5 rounded border p-3">
              <div className="font-medium mb-2">Add member by User ID</div>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="paste a user id…"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                />
                <button className="btn" onClick={() => addMember(targetUserId, "member")}>Add</button>
                <button className="btn btn-brand" onClick={() => addMember(targetUserId, "admin")}>Add as admin</button>
              </div>
              <p className="mt-2 text-sm text-neutral-600">
                (We can switch this to invitation links or email lookup later.)
              </p>
            </div>

            <div className="mt-5">
              <h2 className="font-semibold">Members</h2>
              <div className="mt-2 space-y-2">
                {members.map((m) => (
                  <div key={m.user_id} className="flex items-center justify-between rounded border p-2">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={(m.profile?.avatar_url || "/default-avatar.png") + "?t=1"}
                        alt=""
                        width={36}
                        height={36}
                        style={{ borderRadius: 9999, objectFit: "cover" }}
                      />
                      <div>
                        <div className="font-medium">{m.profile?.full_name || "Member"}</div>
                        <div className="text-xs text-neutral-600">{m.user_id}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block rounded-full bg-zinc-100 px-2 py-1 text-sm">{m.role}</span>
                      {m.role !== "owner" && (
                        <>
                          {m.role === "admin" ? (
                            <button className="btn" onClick={() => setRole(m.user_id, "member")}>Demote</button>
                          ) : (
                            <button className="btn btn-brand" onClick={() => setRole(m.user_id, "admin")}>Promote</button>
                          )}
                          <button className="btn" onClick={() => removeMember(m.user_id)}>Remove</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
