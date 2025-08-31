// components/DemoCollabPosts.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createPostRPC,
  uploadMediaToPost,
  listPostMedia,
  removeMedia,
  inviteCollaborator,
  listMyInvites,
  respondToInvite,
  signedUrlFromStoragePath,
} from "@/lib/collab-demo";

type Media = {
  id: string;
  storage_path: string;
  type: "image" | "video";
  sort_order: number | null;
  created_by: string;
  created_at: string;
};

export default function DemoCollabPosts() {
  const [step, setStep] = useState<"create" | "use">("create");
  const [postId, setPostId] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"friends" | "private">("friends");
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<Media[]>([]);
  const [collabUserId, setCollabUserId] = useState("");
  const [invites, setInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  const canUpload = useMemo(() => !!postId && files && files.length > 0, [postId, files]);

  async function handleCreatePost() {
    try {
      const id = await createPostRPC({
        caption,
        description,
        visibility,
      });
      setPostId(id);
      setStep("use");
    } catch (err: any) {
      alert("Create failed: " + err.message);
    }
  }

  async function refreshMedia() {
    if (!postId) return;
    try {
      const rows = await listPostMedia(postId);
      setMedia(rows as Media[]);
    } catch (e: any) {
      console.error(e);
      alert("Load media failed: " + e.message);
    }
  }

  async function doUpload() {
    if (!postId || !files || files.length === 0) return;
    setUploading(true);
    try {
      await uploadMediaToPost(postId, Array.from(files));
      setFiles(null);
      await refreshMedia();
    } catch (e: any) {
      alert("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  }

  async function doInvite() {
    if (!postId || !collabUserId) return;
    try {
      await inviteCollaborator(postId, collabUserId.trim());
      alert("Invite sent.");
      setCollabUserId("");
    } catch (e: any) {
      alert("Invite failed: " + e.message);
    }
  }

  async function loadInvites() {
    setLoadingInvites(true);
    try {
      const rows = await listMyInvites();
      setInvites(rows);
    } catch (e: any) {
      alert("Loading invites failed: " + e.message);
    } finally {
      setLoadingInvites(false);
    }
  }

  useEffect(() => {
    if (step === "use" && postId) refreshMedia();
  }, [step, postId]);

  useEffect(() => {
    loadInvites();
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5] text-neutral-800">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-semibold mb-2">Collaborative Posts — Demo</h1>
        <p className="mb-6">Create or pick a post, upload multiple photos/videos, and invite collaborators.</p>

        {/* Step switcher */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setStep("create")}
            className={`px-3 py-2 rounded-xl ${step === "create" ? "bg-purple-200" : "bg-white"} shadow`}
          >
            Create a new post
          </button>
          <button
            onClick={() => setStep("use")}
            className={`px-3 py-2 rounded-xl ${step === "use" ? "bg-purple-200" : "bg-white"} shadow`}
          >
            Use existing post
          </button>
        </div>

        {step === "create" ? (
          <div className="bg-white rounded-2xl p-4 shadow mb-8">
            <label className="block text-sm mb-1">Caption</label>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} className="w-full border rounded-lg p-2 mb-3" />

            <label className="block text-sm mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded-lg p-2 mb-3" />

            <label className="block text-sm mb-1">Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
              className="w-full border rounded-lg p-2 mb-4"
            >
              <option value="friends">Friends (goes to friends’ Home feed)</option>
              <option value="private">Private (only on profiles)</option>
            </select>

            <button
              onClick={handleCreatePost}
              className="w-full rounded-xl bg-purple-500 hover:bg-purple-600 text-white py-2"
            >
              Create Post
            </button>

            {postId && (
              <p className="mt-3 text-sm">
                Created Post ID: <span className="font-mono">{postId}</span>
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 shadow mb-8">
            <label className="block text-sm mb-1">Post ID (UUID)</label>
            <input
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
              placeholder="e.g. 71a6e2f7-...."
              className="w-full border rounded-lg p-2"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={refreshMedia}
                className="rounded-xl bg-purple-500 hover:bg-purple-600 text-white px-4 py-2"
              >
                Load Media
              </button>
            </div>
          </div>
        )}

        {/* Uploader */}
        <div className="bg-white rounded-2xl p-4 shadow mb-8">
          <h2 className="text-xl font-semibold mb-3">Upload media</h2>
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) => setFiles(e.target.files)}
            className="mb-3"
          />
          <button
            disabled={!canUpload || uploading}
            onClick={doUpload}
            className={`rounded-xl px-4 py-2 ${canUpload ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-gray-200 text-gray-500"}`}
          >
            {uploading ? "Uploading…" : "Upload to Post"}
          </button>

          {/* Media grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            {media.map((m) => (
              <MediaTile key={m.id} media={m} onDelete={async () => {
                await removeMedia(m.id, m.storage_path);
                await refreshMedia();
              }}/>
            ))}
          </div>
        </div>

        {/* Collaborators */}
        <div className="bg-white rounded-2xl p-4 shadow mb-8">
          <h2 className="text-xl font-semibold mb-3">Invite collaborators</h2>
          <label className="block text-sm mb-1">Friend’s user_id (UUID)</label>
          <input
            value={collabUserId}
            onChange={(e) => setCollabUserId(e.target.value)}
            placeholder="paste their Supabase auth user_id"
            className="w-full border rounded-lg p-2 mb-3"
          />
          <button onClick={doInvite} className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-4 py-2">
            Send Invite
          </button>
        </div>

        {/* My Invites */}
        <div className="bg-white rounded-2xl p-4 shadow mb-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your tag invites</h2>
            <button onClick={loadInvites} className="text-sm px-3 py-1 rounded-lg bg-gray-100">Refresh</button>
          </div>
          {loadingInvites ? (
            <p className="mt-3 text-sm">Loading…</p>
          ) : invites.length === 0 ? (
            <p className="mt-3 text-sm">No invites right now.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {invites.map((inv) => (
                <li key={`${inv.post_id}-${inv.created_at}`} className="p-3 rounded-xl border flex items-center justify-between">
                  <div>
                    <div className="text-sm">Post: <span className="font-mono">{inv.post_id}</span></div>
                    <div className="text-xs text-gray-500">Status: {inv.status} • Can edit: {String(inv.can_edit)}</div>
                  </div>
                  {inv.status === "invited" && (
                    <div className="flex gap-2">
                      <button
                        onClick={async () => { await respondToInvite(inv.post_id, true); await loadInvites(); }}
                        className="px-3 py-1 rounded-lg bg-green-500 text-white"
                      >
                        Accept
                      </button>
                      <button
                        onClick={async () => { await respondToInvite(inv.post_id, false); await loadInvites(); }}
                        className="px-3 py-1 rounded-lg bg-red-500 text-white"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="text-center text-xs text-gray-500">
          Lavender + light sandy palette • Fully responsive
        </footer>
      </div>
    </div>
  );
}

function MediaTile({ media, onDelete }: { media: Media; onDelete: () => Promise<void>}) {
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const signed = await signedUrlFromStoragePath(media.storage_path, 3600);
        setUrl(signed);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [media.storage_path]);

  return (
    <div className="relative group rounded-xl overflow-hidden border">
      {media.type === "image" ? (
        <img src={url} alt="" className="w-full h-40 object-cover" />
      ) : (
        <video src={url} controls className="w-full h-40 object-cover" />
      )}
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition bg-black/70 text-white text-xs px-2 py-1 rounded-md"
      >
        Delete
      </button>
    </div>
  );
}
