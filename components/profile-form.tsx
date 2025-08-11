"use client";

import { useState } from "react";

type Props = {
  initial: { full_name: string; bio: string; location: string };
};

export default function ProfileForm({ initial }: Props) {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const res = await fetch("/profile/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not save");
      setStatus("saved");
      setMessage("Profile updated.");
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message || "Something went wrong.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm font-medium">
        Display name
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={form.full_name}
          onChange={(e) => update("full_name", e.target.value)}
          placeholder="Your name"
        />
      </label>

      <label className="block text-sm font-medium">
        Location
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={form.location}
          onChange={(e) => update("location", e.target.value)}
          placeholder="City, Country"
        />
      </label>

      <label className="block text-sm font-medium">
        Bio
        <textarea
          className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[100px]"
          value={form.bio}
          onChange={(e) => update("bio", e.target.value)}
          placeholder="A few words about you…"
        />
      </label>

      <div className="flex items-center justify-between gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-2xl bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Save profile"}
        </button>
        <p
          className={`text-sm ${
            status === "error" ? "text-red-600" : "text-green-700"
          }`}
        >
          {message}
        </p>
      </div>
    </form>
  );
}
