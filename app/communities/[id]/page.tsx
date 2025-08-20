// app/communities/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import CommunityPhotoUploader from "@/components/CommunityPhotoUploader";

const AddPinModal = dynamic(() => import("@/components/community/AddPinModal"), { ssr: false });
const MapExplorerClient = dynamic(() => import("@/components/community/MapExplorerClient"), { ssr: false });

type Community = {
  id: string;
  title: string;
  category: string | null;
  zip: string | null;
  about: string | null;
  created_at: string;
  photo_url: string | null;
  created_by?: string | null;
};

type MapPin = {
  id: string;
  community_id: string | null;
  name: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  website_url: string | null;
  categories?: string[] | null;
  // keep optional + string to match DB
  day_of_week?: string | null;
  time_local?: string | null;
};

type MapCommunity = { id: string; title: string; category: string | null };

const CATEGORIES = [
  "Wellness","Meditation","Yoga","Breathwork","Sound Baths","Drum Circles",
  "Arts & Crafts","Nature/Outdoors","Parenting","Recovery/Support","Local Events","Other",
];

// --- Adapter: normalize day_of_week to a required 0..6 number for MapExplorerClient ---
function normalizeDow(day: string | null | undefined): number {
  if (day == null) return 0; // default Sunday
  const n = Number(day);
  if (!Number.isNaN(n) && n >= 0 && n <= 6) return n;
  const s = String(day).toLowerCase();
  if (s.startsWith("sun")) return 0;
  if (s.startsWith("mon")) return 1;
  if (s.startsWith("tue")) return 2;
  if (s.startsWith("wed")) return 3;
  if (s.startsWith("thu")) return 4;
  if (s.startsWith("fri")) return 5;
  if (s.startsWith("sat")) return 6;
  return 0;
}

export default function Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const communityId = params.id;

  const [me, setMe] = useState<string | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"discussion" | "happening" | "about" | "pins">("discussion");

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editCat, setEditCat] = useState<string>("");
  const [editZip, setEditZip] = useState<string>("");
  const [editAbout, setEditAbout] = useState<string>("");
  const [editPhoto, setEditPhoto] = useState<string>("");

  const [isAdmin, setIsAdmin] = useState(false);

  const [pins, setPins] = useState<MapPin[]>([]);
