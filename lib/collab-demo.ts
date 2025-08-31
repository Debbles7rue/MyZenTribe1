// lib/collab-demo.ts
"use client";

import { supabase } from "@/lib/supabaseClient";

export type Visibility = "private" | "friends";

export async function getUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not signed in");
  return data.user.id;
}

/** Create a post using the RPC that adapts to any posts schema. */
export async function createPostRPC(opts: {
  caption?: string | null;
  description?: string | null;
  visibility?: Visibility;
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_collab_post", {
    p_caption: opts.caption ?? null,
    p_description: opts.description ?? null,
    p_visibility: opts.visibility ?? "friends",
  });
  if (error) throw error;
  return data as string;
}

/** List your posts by id only (owner is detected server-side). */
export async function listMyPostIds(): Promise<string[]> {
  const uid = await getUserId();
  // We rely on posts_owner() helper
  const { data, error } = await supabase
    .from("posts")
    .select("id")
    .in("id", supabase.rpc as any); // placeholder to avoid TS trip

  // Workaround: use a SQL view via RPC for safety
  const { data: rows, error: err2 } = await supabase.rpc("list_my_posts_demo", {});
  if (err2) throw err2;
  return (rows as { id: string }[]).map((r) => r.id);
}

/** Upload selected files into post-media bucket and register in post_media. */
export async function uploadMediaToPost(postId: string, files: File[]) {
  const uid = await getUserId();

  const results: { id: string; path: string }[] = [];
  for (const file of files) {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${uid}/${crypto.randomUUID()}.${ext}`;
    // 1) upload to storage (private bucket)
    const { error: upErr } = await supabase.storage
      .from("post-media")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
    if (upErr) throw upErr;

    // 2) insert in post_media (RLS ensures only owner/collab can do this)
    const type = file.type.startsWith("video") ? "video" : "image";
    const storage_path = `post-media/${path}`;
    const { data, error } = await supabase
      .from("post_media")
      .insert({
        post_id: postId,
        created_by: uid,
        storage_path,
        type,
      })
      .select("id")
      .single();
    if (error) throw error;

    results.push({ id: data.id, path: storage_path });
  }
  return results;
}

export async function listPostMedia(postId: string) {
  const { data, error } = await supabase
    .from("post_media")
    .select("id, storage_path, type, sort_order, created_by, created_at")
  .eq("post_id", postId)
  .order("sort_order", { ascending: true })
  .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function removeMedia(mediaId: string, storagePath: string) {
  // delete DB row first (RLS: owner or creator)
  const { error } = await supabase.from("post_media").delete().eq("id", mediaId);
  if (error) throw error;

  // delete storage object (policy already checks permissions)
  const rel = storagePath.replace(/^post-media\//, "");
  await supabase.storage.from("post-media").remove([rel]);
}

export async function inviteCollaborator(postId: string, targetUserId: string) {
  const me = await getUserId();
  // create invite
  const { error } = await supabase.from("post_collaborators").upsert({
    post_id: postId,
    user_id: targetUserId,
    status: "invited",
    can_edit: false,
    added_by: me,
  });
  if (error) throw error;

  // notify
  await supabase.from("notifications").insert({
    user_id: targetUserId,
    kind: "post_tag_invite",
    payload: { post_id: postId, from_user_id: me },
  });
}

export async function listMyInvites() {
  const me = await getUserId();
  const { data, error } = await supabase
    .from("post_collaborators")
    .select("post_id, status, can_edit, added_by, updated_at, created_at")
    .eq("user_id", me)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function respondToInvite(postId: string, accept: boolean) {
  const me = await getUserId();
  const { error } = await supabase
    .from("post_collaborators")
    .update({
      status: accept ? "accepted" : "declined",
      can_edit: accept ? true : false,
    })
    .eq("post_id", postId)
    .eq("user_id", me);
  if (error) throw error;

  // notify the post owner
  await supabase.from("notifications").insert({
    user_id: null, // optional: you can fill with posts_owner via RPC if you add it
    kind: "post_tag_accepted",
    payload: { post_id: postId, from_user_id: me, accepted: accept },
  });
}

export function publicUrlFromStoragePath(storage_path: string) {
  // You have a private bucket; for previews, we’ll use signed URLs
  const rel = storage_path.replace(/^post-media\//, "");
  const { data } = supabase.storage.from("post-media").getPublicUrl(rel);
  return data.publicUrl; // only if you flip bucket public; otherwise use signed URLs
}

export async function signedUrlFromStoragePath(storage_path: string, seconds = 3600) {
  const rel = storage_path.replace(/^post-media\//, "");
  const { data, error } = await supabase.storage.from("post-media").createSignedUrl(rel, seconds);
  if (error) throw error;
  return data.signedUrl;
}
