"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

interface Photo {
  id: string;
  file_path: string;
  url?: string;
  caption?: string;
  favorite: boolean;
  taken_at: string;
}

export default function GratitudePhotosPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "favorites">("all");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Load user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Load photos
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    loadPhotos();
  }, [userId, selectedYear]);

  async function loadPhotos() {
    if (!userId) return;
    setLoading(true);

    try {
      const startDate = new Date(selectedYear, 0, 1);
      const endDate = new Date(selectedYear + 1, 0, 1);

      const { data, error } = await supabase
        .from("gratitude_media")
        .select("*")
        .eq("user_id", userId)
        .gte("taken_at", startDate.toISOString())
        .lt("taken_at", endDate.toISOString())
        .order("taken_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const paths = data.map(p => p.file_path);
        const { data: urls } = await supabase.storage
          .from("gratitude-media")
          .createSignedUrls(paths, 3600);

        const urlMap = new Map(
          urls?.map(u => [u.path, u.signedUrl]) || []
        );

        const photosWithUrls = data.map(p => ({
          ...p,
          url: urlMap.get(p.file_path) || ""
        }));

        setPhotos(photosWithUrls);
      } else {
        setPhotos([]);
      }
    } catch (e: any) {
      console.error("Load photos error:", e);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }

  async function toggleFavorite(photo: Photo) {
    if (!userId) return;
    try {
      await supabase
        .from("gratitude_media")
        .update({ favorite: !photo.favorite })
        .eq("id", photo.id);

      setPhotos(photos.map(p => 
        p.id === photo.id ? { ...p, favorite: !p.favorite } : p
      ));
    } catch (e: any) {
      console.error("Toggle favorite error:", e);
    }
  }

  const filteredPhotos = filter === "favorites" 
    ? photos.filter(p => p.favorite)
    : photos;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please sign in</h2>
          <Link href="/auth" className="text-purple-600 underline">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Photo Library
          </h1>
          <Link 
            href="/gratitude" 
            className="px-6 py-2 bg-white rounded-xl shadow hover:shadow-lg transition-all"
          >
            ← Back to Journal
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-lg mb-6 flex gap-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 rounded-lg border"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg ${
              filter === "all" ? "bg-purple-600 text-white" : "bg-gray-100"
            }`}
          >
            All ({photos.length})
          </button>
          <button
            onClick={() => setFilter("favorites")}
            className={`px-4 py-2 rounded-lg ${
              filter === "favorites" ? "bg-purple-600 text-white" : "bg-gray-100"
            }`}
          >
            ⭐ Favorites ({photos.filter(p => p.favorite).length})
          </button>
        </div>

        {/* Photo Grid */}
        {loading ? (
          <p className="text-center">Loading photos...</p>
        ) : filteredPhotos.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <p className="text-gray-600">No photos yet for {selectedYear}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPhotos.map(photo => (
              <div key={photo.id} className="bg-white rounded-xl overflow-hidden shadow group relative">
                <img
                  src={photo.url}
                  alt={photo.caption || "Gratitude photo"}
                  className="w-full h-48 object-cover cursor-pointer"
                  onClick={() => window.open(photo.url, '_blank')}
                />
                <div className="p-2">
                  <p className="text-xs text-gray-500">
                    {new Date(photo.taken_at).toLocaleDateString()}
                  </p>
                  <button
                    onClick={() => toggleFavorite(photo)}
                    className="text-lg"
                  >
                    {photo.favorite ? "⭐" : "☆"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
