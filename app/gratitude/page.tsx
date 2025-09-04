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
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

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
  }, [userId, selectedYear, selectedMonth]);

  async function loadPhotos() {
    if (!userId) return;
    setLoading(true);

    try {
      // Build query
      let query = supabase
        .from("gratitude_media")
        .select("*")
        .eq("user_id", userId)
        .order("taken_at", { ascending: false });

      // Filter by year
      const startDate = selectedMonth 
        ? new Date(selectedYear, selectedMonth - 1, 1)
        : new Date(selectedYear, 0, 1);
      const endDate = selectedMonth
        ? new Date(selectedYear, selectedMonth, 1)
        : new Date(selectedYear + 1, 0, 1);

      query = query
        .gte("taken_at", startDate.toISOString())
        .lt("taken_at", endDate.toISOString());

      const { data, error } = await query;

      if (error) throw error;

      // Get signed URLs for all photos
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

  async function deletePhoto(photo: Photo) {
    if (!userId || !confirm("Delete this photo?")) return;

    try {
      // Delete from storage
      await supabase.storage
        .from("gratitude-media")
        .remove([photo.file_path]);

      // Delete from database
      await supabase
        .from("gratitude_media")
        .delete()
        .eq("id", photo.id);

      setPhotos(photos.filter(p => p.id !== photo.id));
    } catch (e: any) {
      console.error("Delete error:", e);
    }
  }

  const filteredPhotos = filter === "favorites" 
    ? photos.filter(p => p.favorite)
    : photos;

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please sign in to view your photo library</h2>
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
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              Gratitude Photo Library
            </h1>
            <p className="text-gray-600">
              Your visual journey of gratitude
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Link 
              href="/gratitude" 
              className="px-6 py-2 bg-white rounded-xl shadow hover:shadow-lg transition-all"
            >
              Back to Journal
            </Link>
            <Link 
              href="/gratitude/slideshow" 
              className="px-6 py-2 bg-purple-600 text-white rounded-xl shadow hover:shadow-lg transition-all"
            >
              View Slideshow
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Year/Month Filter */}
            <div className="flex gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-purple-400"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={selectedMonth || ""}
                onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : null)}
                className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-purple-400"
              >
                <option value="">All Months</option>
                {months.map((month, i) => (
                  <option key={i} value={i + 1}>{month}</option>
                ))}
              </select>
            </div>

            {/* View Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filter === "all"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                All Photos ({photos.length})
              </button>
              <button
                onClick={() => setFilter("favorites")}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filter === "favorites"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                Favorites ({photos.filter(p => p.favorite).length})
              </button>
            </div>
          </div>
        </div>

        {/* Photo Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full mx-auto mb-4 animate-pulse bg-gradient-to-r from-purple-400 to-pink-400" />
            <p className="text-gray-600">Loading your photos...</p>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <p className="text-gray-600 text-lg mb-4">
              {filter === "favorites" 
                ? "No favorite photos yet. Star some photos to see them here!"
                : selectedMonth 
                  ? `No photos from ${months[selectedMonth - 1]} ${selectedYear}`
                  : `No photos from ${selectedYear}`}
            </p>
            <Link 
              href="/gratitude"
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
            >
              Add Your First Photo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredPhotos.map(photo => (
              <div
                key={photo.id}
                className="group relative bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all"
              >
                <img
                  src={photo.url}
                  alt={photo.caption || "Gratitude moment"}
                  className="w-full h-48 object-cover cursor-pointer"
                  onClick={() => window.open(photo.url, '_blank')}
                />
                
                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    {photo.caption && (
                      <p className="text-white text-sm mb-2 line-clamp-2">
                        {photo.caption}
                      </p>
                    )}
                    <p className="text-white/80 text-xs mb-2">
                      {new Date(photo.taken_at).toLocaleDateString()}
                    </p>
                    <div className="flex justify-between items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(photo);
                        }}
                        className="text-2xl transition-transform hover:scale-110"
                      >
                        {photo.favorite ? "⭐" : "☆"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePhoto(photo);
                        }}
                        className="text-white hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
