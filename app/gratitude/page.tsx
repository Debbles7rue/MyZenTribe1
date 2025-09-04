"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// Types
type EntryType = "glimmer" | "journal";
type MoodLevel = 1 | 2 | 3 | 4 | 5;
type ThemeKey = "lavender" | "sunset" | "forest" | "ocean" | "rose" | "midnight" | "sage";

interface Entry {
  id: string;
  user_id: string;
  body?: string;
  content?: string;
  entry_date: string;
  entry_type: EntryType;
  mood?: MoodLevel;
  tags?: string[];
  is_favorite?: boolean;
  image_url?: string;
  created_at: string;
}

interface Settings {
  user_id: string;
  activated: boolean;
  recap_frequency?: "daily" | "weekly" | "monthly";
  theme?: string;
  streak_count?: number;
  last_entry_date?: string;
  reminder_time?: string;
  reminder_enabled?: boolean;
}

// Theme configurations
const THEMES: Record<ThemeKey, {
  name: string;
  gradient: string;
  cardBg: string;
  border: string;
  accent: string;
  glow: string;
}> = {
  lavender: {
    name: "Lavender Dreams",
    gradient: "linear-gradient(135deg, #E9D5FF 0%, #F3E8FF 50%, #FDF4FF 100%)",
    cardBg: "rgba(233, 213, 255, 0.1)",
    border: "#E9D5FF",
    accent: "#9333EA",
    glow: "0 0 40px rgba(147, 51, 234, 0.15)"
  },
  sunset: {
    name: "Golden Hour",
    gradient: "linear-gradient(135deg, #FED7AA 0%, #FDBA74 50%, #FB923C 100%)",
    cardBg: "rgba(254, 215, 170, 0.1)",
    border: "#FED7AA",
    accent: "#EA580C",
    glow: "0 0 40px rgba(234, 88, 12, 0.15)"
  },
  forest: {
    name: "Forest Sanctuary",
    gradient: "linear-gradient(135deg, #BBF7D0 0%, #86EFAC 50%, #4ADE80 100%)",
    cardBg: "rgba(187, 247, 208, 0.1)",
    border: "#BBF7D0",
    accent: "#16A34A",
    glow: "0 0 40px rgba(22, 163, 74, 0.15)"
  },
  ocean: {
    name: "Ocean Depths",
    gradient: "linear-gradient(135deg, #BFDBFE 0%, #93C5FD 50%, #60A5FA 100%)",
    cardBg: "rgba(191, 219, 254, 0.1)",
    border: "#BFDBFE",
    accent: "#2563EB",
    glow: "0 0 40px rgba(37, 99, 235, 0.15)"
  },
  rose: {
    name: "Rose Garden",
    gradient: "linear-gradient(135deg, #FECDD3 0%, #FCA5A5 50%, #F87171 100%)",
    cardBg: "rgba(254, 205, 211, 0.1)",
    border: "#FECDD3",
    accent: "#E11D48",
    glow: "0 0 40px rgba(225, 29, 72, 0.15)"
  },
  midnight: {
    name: "Midnight Sky",
    gradient: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A78BFA 100%)",
    cardBg: "rgba(99, 102, 241, 0.1)",
    border: "#A78BFA",
    accent: "#7C3AED",
    glow: "0 0 40px rgba(124, 58, 237, 0.15)"
  },
  sage: {
    name: "Sage Wisdom",
    gradient: "linear-gradient(135deg, #D9F99D 0%, #BEF264 50%, #A3E635 100%)",
    cardBg: "rgba(217, 249, 157, 0.1)",
    border: "#D9F99D",
    accent: "#65A30D",
    glow: "0 0 40px rgba(101, 163, 13, 0.15)"
  }
};

// Mood emojis
const MOOD_EMOJIS = {
  1: { emoji: "😔", label: "Struggling" },
  2: { emoji: "😕", label: "Challenging" },
  3: { emoji: "😌", label: "Neutral" },
  4: { emoji: "😊", label: "Good" },
  5: { emoji: "🥰", label: "Amazing" }
};

// Tags
const TAGS = [
  "gratitude", "family", "friends", "nature", "work", 
  "health", "creativity", "growth", "peace", "joy",
  "love", "achievement", "kindness", "beauty", "abundance"
];

// Quotes
const QUOTES = [
  { text: "Gratitude turns what we have into enough.", author: "Anonymous" },
  { text: "The soul that gives thanks can find comfort in everything.", author: "Hannah Whitall Smith" },
  { text: "Gratitude is not only the greatest of virtues, but the parent of all others.", author: "Marcus Tullius Cicero" },
  { text: "When we focus on our gratitude, the tide of disappointment goes out and the tide of love rushes in.", author: "Kristin Armstrong" },
  { text: "Gratitude makes sense of our past, brings peace for today, and creates a vision for tomorrow.", author: "Melody Beattie" },
  { text: "The more grateful I am, the more beauty I see.", author: "Mary Davis" },
  { text: "Gratitude is the fairest blossom which springs from the soul.", author: "Henry Ward Beecher" },
  { text: "Joy is the simplest form of gratitude.", author: "Karl Barth" },
  { text: "In ordinary life, we hardly realize that we receive a great deal more than we give.", author: "Dietrich Bonhoeffer" },
  { text: "Be thankful for what you have; you'll end up having more.", author: "Oprah Winfrey" },
  { text: "This is a wonderful day. I have never seen this one before.", author: "Maya Angelou" },
  { text: "When you are grateful, fear disappears and abundance appears.", author: "Tony Robbins" },
  { text: "Gratitude is the wine for the soul. Go on. Get drunk.", author: "Rumi" },
  { text: "The roots of all goodness lie in the soil of appreciation.", author: "Dalai Lama" },
  { text: "Acknowledging the good that you already have in your life is the foundation for all abundance.", author: "Eckhart Tolle" },
  { text: "Gratitude is the healthiest of all human emotions.", author: "Zig Ziglar" }
];

// Prompts
const PROMPTS = [
  "What made you smile today?",
  "Who or what are you grateful for right now?",
  "What small moment brought you peace today?",
  "What's something beautiful you noticed?",
  "What made today better than yesterday?",
  "What kindness did you witness or receive?",
  "What simple pleasure did you enjoy?",
  "What challenge taught you something?",
  "What made you feel alive today?",
  "What are you looking forward to?"
];

// Format date helper
function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  if (format === 'yyyy-MM-dd') {
    return `${year}-${month}-${day}`;
  } else if (format === 'h:mm a') {
    return `${displayHours}:${minutes} ${ampm}`;
  }
  return date.toISOString();
}

export default function GratitudePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Settings & Theme
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>("lavender");
  
  // Entries
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const [entryType, setEntryType] = useState<EntryType>("glimmer");
  const [selectedMood, setSelectedMood] = useState<MoodLevel>(3);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // UI State
  const [showTimer, setShowTimer] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [stage, setStage] = useState<"loading" | "welcome" | "science" | "journal">("loading");
  
  // Timer
  const [timerSeconds, setTimerSeconds] = useState(600); // 10 minutes
  const [timerActive, setTimerActive] = useState(false);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  const today = formatDate(new Date(), "yyyy-MM-dd");
  const todayEntries = entries.filter(e => e.entry_date === today);
  const glimmersToday = todayEntries.filter(e => e.entry_type === "glimmer").length;
  const canAddGlimmer = glimmersToday < 10;

  // Load user data
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Load settings and entries
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setStage("welcome");
      return;
    }
    loadData();
  }, [userId]);

  async function loadData() {
    if (!userId) return;
    setLoading(true);
    setError(null);
    
    try {
      // Load settings
      const { data: settingsData } = await supabase
        .from("gratitude_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (settingsData) {
        setSettings(settingsData as Settings);
        setSelectedTheme((settingsData.theme as ThemeKey) || "lavender");
        setStage("journal");
      } else {
        setStage("science");
      }

      // Load entries
      const { data: entriesData } = await supabase
        .from("gratitude_entries")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      setEntries(entriesData as Entry[] || []);
    } catch (e: any) {
      console.error("Load error:", e);
      setStage(settings ? "journal" : "science");
    } finally {
      setLoading(false);
    }
  }

  // Start journal
  async function startJournal() {
    console.log("Starting journal... userId:", userId);
    
    if (!userId) {
      alert("Please sign in first!");
      window.location.href = "/auth";
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const settingsToSave = {
        user_id: userId,
        activated: true,
        theme: selectedTheme,
        recap_frequency: "weekly",
        streak_count: 0,
        last_entry_date: today
      };
      
      console.log("Attempting to save settings:", settingsToSave);
      
      const { data: existing } = await supabase
        .from("gratitude_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      
      let result;
      if (existing) {
        result = await supabase
          .from("gratitude_settings")
          .update({
            activated: true,
            theme: selectedTheme,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId)
          .select()
          .single();
      } else {
        result = await supabase
          .from("gratitude_settings")
          .insert(settingsToSave)
          .select()
          .single();
      }
      
      if (result.error) {
        throw result.error;
      }
      
      setSettings(result.data as Settings);
      setStage("journal");
      console.log("Successfully started journal!");
      
    } catch (e: any) {
      console.error("Full error object:", e);
      let errorMessage = "Could not start journal. ";
      
      if (e?.code === '42P01') {
        errorMessage += "The gratitude_settings table doesn't exist.";
      } else if (e?.code === '42501') {
        errorMessage += "Permission denied. Check RLS policies.";
      } else if (e?.code === '23502') {
        errorMessage += "User ID is missing. Please sign in again.";
      } else {
        errorMessage += e?.message || "Unknown error";
      }
      
      setError(errorMessage);
      alert(errorMessage);
      
    } finally {
      setSaving(false);
    }
  }

  // Handle photo selection
  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Photo must be less than 5MB");
      return;
    }
    
    setSelectedPhoto(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }
  
  // Upload photo to Supabase storage
  async function uploadPhoto(file: File): Promise<string | null> {
    if (!userId) return null;
    
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${userId}/${today}/${Date.now()}.${ext}`;
      
      const { data, error } = await supabase.storage
        .from('gratitude-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('gratitude-media')
        .getPublicUrl(fileName);
      
      // Also save to gratitude_media table for gallery
      await supabase
        .from('gratitude_media')
        .insert({
          user_id: userId,
          file_path: fileName,
          caption: draft.substring(0, 100), // Use first 100 chars as caption
          favorite: false,
          taken_at: new Date().toISOString()
        });
      
      return urlData.publicUrl;
    } catch (e: any) {
      console.error("Photo upload error:", e);
      return null;
    }
  }

  // Add entry
  async function addEntry() {
    if (!userId || !draft.trim()) return;
    
    if (entryType === "glimmer" && !canAddGlimmer) {
      setError("You've reached 10 glimmers for today! Amazing work!");
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      let imageUrl = null;
      
      // Upload photo if selected
      if (selectedPhoto) {
        setUploadingPhoto(true);
        imageUrl = await uploadPhoto(selectedPhoto);
        setUploadingPhoto(false);
        
        if (!imageUrl) {
          throw new Error("Failed to upload photo");
        }
      }
      
      const newEntry = {
        user_id: userId,
        body: draft.trim(),
        entry_date: today,
        entry_type: entryType,
        mood: selectedMood,
        tags: selectedTags.length > 0 ? selectedTags : null,
        is_favorite: false,
        image_url: imageUrl
      };
      
      const { data, error } = await supabase
        .from("gratitude_entries")
        .insert([newEntry])
        .select()
        .single();
      
      if (error) throw error;
      
      setEntries([data as Entry, ...entries]);
      setDraft("");
      setSelectedTags([]);
      setSelectedMood(3);
      setSelectedPhoto(null);
      setPhotoPreview(null);
      setSuccessMessage(entryType === "glimmer" ? "✨ Glimmer captured!" : "📝 Entry saved!");
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Update streak if needed
      if (settings && settings.last_entry_date !== today) {
        const yesterday = formatDate(new Date(Date.now() - 86400000), "yyyy-MM-dd");
        const newStreak = settings.last_entry_date === yesterday 
          ? (settings.streak_count || 0) + 1 
          : 1;
          
        await supabase
          .from("gratitude_settings")
          .update({ 
            last_entry_date: today, 
            streak_count: newStreak 
          })
          .eq("user_id", userId);
          
        setSettings({
          ...settings,
          last_entry_date: today,
          streak_count: newStreak
        });
      }
    } catch (e: any) {
      console.error("Add error:", e);
      setError(e?.message || "Could not save entry");
    } finally {
      setSaving(false);
      setUploadingPhoto(false);
    }
  }

  // Delete entry
  async function deleteEntry(id: string) {
    if (!userId || saving) return;
    
    if (!confirm("Delete this entry?")) return;
    
    setSaving(true);
    
    try {
      await supabase
        .from("gratitude_entries")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      
      setEntries(entries.filter(e => e.id !== id));
    } catch (e: any) {
      setError(e?.message || "Could not delete entry");
    } finally {
      setSaving(false);
    }
  }

  // Toggle favorite
  async function toggleFavorite(id: string, current: boolean) {
    if (!userId) return;
    
    try {
      await supabase
        .from("gratitude_entries")
        .update({ is_favorite: !current })
        .eq("id", id)
        .eq("user_id", userId);
      
      setEntries(entries.map(e => 
        e.id === id ? { ...e, is_favorite: !current } : e
      ));
    } catch (e: any) {
      setError(e?.message || "Could not update favorite");
    }
  }

  // Timer functions
  function startTimer() {
    setShowTimer(true);
    setTimerActive(true);
    setTimerSeconds(600);
    
    timerInterval.current = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          stopTimer();
          alert("⏰ Time's up! Your 10 minutes of screen-free time is complete. You're ready to journal!");
          setSuccessMessage("Beautiful! You're centered and ready to capture your gratitude.");
          setTimeout(() => setSuccessMessage(null), 5000);
          setShowTimer(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function stopTimer() {
    setTimerActive(false);
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  }

  const timerMinutes = Math.floor(timerSeconds / 60);
  const timerSecs = timerSeconds % 60;

  // Current theme
  const theme = THEMES[selectedTheme];

  // Current quote
  const currentQuote = QUOTES[quoteIndex % QUOTES.length];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full mx-auto mb-4 animate-pulse" 
               style={{ background: THEMES.lavender.gradient }} />
          <p className="text-gray-600">Opening your journal...</p>
        </div>
      </div>
    );
  }

  // Welcome screen (not logged in)
  if (stage === "welcome" && !userId) {
    return (
      <div className="min-h-screen" style={{ background: THEMES.lavender.gradient }}>
        <div className="container mx-auto max-w-4xl px-4 py-12">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8 md:p-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Welcome to Your Gratitude Journal
              </h1>
              
              <p className="text-lg text-gray-700 mb-8">
                Transform your mindset with the power of gratitude. Please sign in to begin.
              </p>
              
              <Link 
                href="/auth"
                className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              >
                Sign In to Continue
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Science/Instructions screen
  if (stage === "science") {
    return (
      <div className="min-h-screen" style={{ background: theme.gradient }}>
        <div className="container mx-auto max-w-4xl px-4 py-12">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8 md:p-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                The Science of Gratitude
              </h1>
              
              <div className="space-y-6 text-gray-700">
                <div className="bg-purple-50 rounded-2xl p-6">
                  <h3 className="font-semibold text-purple-900 mb-3">🧠 How Gratitude Rewires Your Brain</h3>
                  <p className="text-purple-800 mb-3">
                    Neuroscience research shows that practicing gratitude literally changes your brain structure. 
                    When you focus on what you're grateful for, you strengthen neural pathways that help you 
                    naturally notice more positive things in your life.
                  </p>
                  <p className="text-purple-800">
                    <strong>Just 3 gratitude thoughts daily</strong> can measurably rewire your neural pathways 
                    in as little as 21 days, helping reduce depression and anxiety while boosting happiness.
                  </p>
                </div>

                <div className="bg-green-50 rounded-2xl p-6">
                  <h3 className="font-semibold text-green-900 mb-3">💚 The Key: Feel It, Don't Just Think It</h3>
                  <p className="text-green-800">
                    Research shows that <strong>feeling gratitude</strong>—not just thinking about it—activates 
                    your parasympathetic nervous system, reducing stress hormones and increasing dopamine.
                  </p>
                </div>

                <div className="bg-blue-50 rounded-2xl p-6">
                  <h3 className="font-semibold text-blue-900 mb-3">✨ Your Daily Practice</h3>
                  <ol className="space-y-2 text-blue-800">
                    <li><strong>1.</strong> Take 10 minutes with no screens before journaling</li>
                    <li><strong>2.</strong> Breathe deeply (4 counts in, 6 counts out)</li>
                    <li><strong>3.</strong> Feel for a sensation of warmth in your body</li>
                    <li><strong>4.</strong> Write from that feeling, not just your thoughts</li>
                    <li><strong>5.</strong> Capture 3 things you're genuinely grateful for</li>
                  </ol>
                </div>

                <div className="bg-amber-50 rounded-2xl p-6">
                  <h3 className="font-semibold text-amber-900 mb-3">🌟 What Are Glimmers?</h3>
                  <p className="text-amber-800">
                    Glimmers are micro-moments of joy—the opposite of triggers. They're tiny experiences that 
                    make you feel calm or content. A warm cup of coffee, sunlight, a kind text. Small but powerful.
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="font-semibold mb-4">Choose Your Theme</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                  {(Object.keys(THEMES) as ThemeKey[]).map(key => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedTheme(key);
                        if (settings && userId) {
                          supabase
                            .from("gratitude_settings")
                            .update({ theme: key })
                            .eq("user_id", userId);
                        }
                      }}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        selectedTheme === key 
                          ? 'border-purple-500 shadow-lg scale-105' 
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="h-16 rounded-lg mb-2" style={{ background: THEMES[key].gradient }} />
                      <p className="text-sm font-medium">{THEMES[key].name}</p>
                    </button>
                  ))}
                </div>

                <div className="flex gap-4">
                  {settings ? (
                    <button
                      onClick={() => setStage("journal")}
                      className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                    >
                      Continue to Journal
                    </button>
                  ) : (
                    <button
                      onClick={startJournal}
                      disabled={saving || !userId}
                      className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50"
                    >
                      {saving ? "Starting..." : "Begin Your Practice"}
                    </button>
                  )}
                  
                  {settings && (
                    <button
                      onClick={() => window.location.href = "/profile"}
                      className="px-8 py-4 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-all"
                    >
                      Back to Profile
                    </button>
                  )}
                </div>
              </div>
              
              {error && (
                <div className="mt-4 p-4 rounded-xl bg-red-100 text-red-700">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main journal
  return (
    <div className="min-h-screen" style={{ background: theme.gradient }}>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              Gratitude Journal
            </h1>
            <p className="text-gray-600">
              {settings?.streak_count ? `🔥 ${settings.streak_count} day streak!` : 'Start your gratitude practice'}
            </p>
          </div>
          <Link 
            href="/profile" 
            className="mt-4 md:mt-0 px-6 py-2 bg-white rounded-xl shadow hover:shadow-lg transition-all"
          >
            Back to Profile
          </Link>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 p-4 rounded-xl bg-green-100 text-green-700 animate-fade-in">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-100 text-red-700 animate-fade-in">
            {error}
          </div>
        )}

        {/* Timer Modal */}
        {showTimer && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full animate-scale-in">
              <h2 className="text-2xl font-bold mb-4">Screen-Free Time</h2>
              <p className="text-gray-600 mb-6">
                Step away from all screens. Breathe deeply. Notice the sensations in your body, 
                the sounds around you. Let your mind settle. An alert will sound when time is up.
              </p>
              
              <div className="text-6xl font-bold text-center mb-6" style={{ color: theme.accent }}>
                {timerMinutes}:{timerSecs.toString().padStart(2, '0')}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={timerActive ? stopTimer : startTimer}
                  className="flex-1 py-3 rounded-xl font-semibold text-white transition-all hover:shadow-lg"
                  style={{ background: theme.accent }}
                >
                  {timerActive ? "Pause" : "Start"}
                </button>
                <button
                  onClick={() => {
                    setShowTimer(false);
                    stopTimer();
                  }}
                  className="flex-1 py-3 rounded-xl font-semibold border-2 border-gray-300 hover:bg-gray-50 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Quote & Tools */}
          <div className="space-y-6">
            {/* Daily Quote Card */}
            <div className="bg-white rounded-2xl p-6 shadow-lg animate-fade-in" style={{ boxShadow: theme.glow }}>
              <h3 className="font-semibold text-gray-800 mb-4">Today's Inspiration</h3>
              <blockquote className="text-lg italic text-gray-700 mb-2">
                "{currentQuote.text}"
              </blockquote>
              <p className="text-gray-600 mb-4">— {currentQuote.author}</p>
              
              <button
                onClick={() => setQuoteIndex(prev => prev + 1)}
                className="w-full py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Next Quote →
              </button>
            </div>

            {/* Mindfulness Tools */}
            <div className="bg-white rounded-2xl p-6 shadow-lg animate-fade-in">
              <h3 className="font-semibold text-gray-800 mb-4">Mindfulness Tools</h3>
              
              <button
                onClick={() => setShowTimer(true)}
                className="w-full py-3 rounded-xl mb-3 text-white font-medium transition-all hover:shadow-lg"
                style={{ background: theme.accent }}
              >
                ⏱️ Screen-Free Timer (10 min)
              </button>
              
              <button
                onClick={() => setShowPrompts(!showPrompts)}
                className="w-full py-3 rounded-xl mb-3 border-2 border-gray-200 font-medium hover:bg-gray-50 transition-colors"
              >
                💭 {showPrompts ? 'Hide' : 'Show'} Prompts
              </button>
              
              <button
                onClick={() => setStage("science")}
                className="w-full py-3 rounded-xl border-2 border-gray-200 font-medium hover:bg-gray-50 transition-colors"
              >
                📖 Instructions & Theme
              </button>
              
              {showPrompts && (
                <div className="mt-4 space-y-2 animate-fade-in">
                  {PROMPTS.slice(0, 5).map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setDraft(prompt);
                        setShowPrompts(false);
                      }}
                      className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl p-6 shadow-lg animate-fade-in">
              <h3 className="font-semibold text-gray-800 mb-4">Your Progress</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Today's Glimmers</span>
                  <span className="font-semibold">{glimmersToday}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Entries</span>
                  <span className="font-semibold">{entries.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Favorites</span>
                  <span className="font-semibold">{entries.filter(e => e.is_favorite).length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column - Entry Creator */}
          <div className="lg:col-span-2 space-y-6">
            {/* Entry Creator */}
            <div className="bg-white rounded-2xl p-6 shadow-lg animate-fade-in">
              <h3 className="font-semibold text-gray-800 mb-4">Capture Your Gratitude</h3>
              
              {/* Entry Type Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setEntryType("glimmer")}
                  className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                    entryType === "glimmer" 
                      ? "text-white shadow-lg" 
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                  style={entryType === "glimmer" ? { background: theme.accent } : {}}
                >
                  ✨ Glimmer (Quick)
                </button>
                <button
                  onClick={() => setEntryType("journal")}
                  className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                    entryType === "journal" 
                      ? "text-white shadow-lg" 
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                  style={entryType === "journal" ? { background: theme.accent } : {}}
                >
                  📝 Journal Entry
                </button>
              </div>

              {/* Entry Input */}
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  entryType === "glimmer" 
                    ? "A tiny moment of joy, peace, or beauty..." 
                    : "Take your time. Feel the gratitude in your body as you write..."
                }
                rows={entryType === "glimmer" ? 3 : 6}
                className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none resize-none transition-colors"
                style={{ borderColor: draft ? theme.border : undefined }}
                maxLength={entryType === "glimmer" ? 140 : 5000}
              />
              {entryType === "glimmer" && (
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {draft.length}/140 characters
                </p>
              )}

              {/* Mood Selector */}
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">How are you feeling?</p>
                <div className="flex gap-3">
                  {([1, 2, 3, 4, 5] as MoodLevel[]).map(mood => (
                    <button
                      key={mood}
                      onClick={() => setSelectedMood(mood)}
                      className={`p-3 rounded-xl transition-all ${
                        selectedMood === mood 
                          ? "scale-110 shadow-lg" 
                          : "hover:scale-105"
                      }`}
                      style={selectedMood === mood ? { background: theme.cardBg } : {}}
                    >
                      <span className="text-2xl">{MOOD_EMOJIS[mood].emoji}</span>
                      <p className="text-xs mt-1">{MOOD_EMOJIS[mood].label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Add tags (optional)</p>
                <div className="flex flex-wrap gap-2">
                  {TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => {
                        if (selectedTags.includes(tag)) {
                          setSelectedTags(selectedTags.filter(t => t !== tag));
                        } else {
                          setSelectedTags([...selectedTags, tag]);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition-all ${
                        selectedTags.includes(tag)
                          ? "text-white shadow"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                      style={selectedTags.includes(tag) ? { background: theme.accent } : {}}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo Upload (Simple) */}
              {entryType === "glimmer" && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Add a photo (optional)</p>
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                        📷 Choose Photo
                      </div>
                    </label>
                    
                    {photoPreview && (
                      <div className="relative">
                        <img
                          src={photoPreview}
                          alt="Preview"
                          className="h-20 w-20 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => {
                            setSelectedPhoto(null);
                            setPhotoPreview(null);
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={addEntry}
                disabled={!draft.trim() || saving || uploadingPhoto || (entryType === "glimmer" && !canAddGlimmer)}
                className="w-full mt-6 py-3 rounded-xl text-white font-semibold disabled:opacity-50 transition-all hover:shadow-lg"
                style={{ background: theme.accent }}
              >
                {uploadingPhoto ? "Uploading photo..." : saving ? "Saving..." : `Add ${entryType === "glimmer" ? "Glimmer" : "Entry"}`}
              </button>
            </div>

            {/* Today's Entries */}
            {todayEntries.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-lg animate-fade-in">
                <h3 className="font-semibold text-gray-800 mb-4">Today's Gratitude</h3>
                <div className="space-y-3">
                  {todayEntries.map(entry => (
                    <div
                      key={entry.id}
                      className="p-4 rounded-xl transition-all hover:shadow-md animate-fade-in"
                      style={{ background: theme.cardBg }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-600">
                              {entry.entry_type === "glimmer" ? "✨" : "📝"} 
                              {entry.entry_type}
                            </span>
                            {entry.mood && (
                              <span className="text-lg">{MOOD_EMOJIS[entry.mood].emoji}</span>
                            )}
                            <span className="text-sm text-gray-500">
                              {formatDate(new Date(entry.created_at), "h:mm a")}
                            </span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {entry.body || entry.content}
                          </p>
                          {entry.image_url && (
                            <img
                              src={entry.image_url}
                              alt="Gratitude moment"
                              className="mt-3 rounded-lg max-w-full h-auto max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(entry.image_url, '_blank')}
                            />
                          )}
                          {entry.tags && entry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {entry.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 rounded-full text-xs"
                                  style={{ background: theme.cardBg }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleFavorite(entry.id, !!entry.is_favorite)}
                            className="text-2xl transition-transform hover:scale-110"
                            title={entry.is_favorite ? "Remove from favorites" : "Add to favorites"}
                          >
                            {entry.is_favorite ? "⭐" : "☆"}
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            disabled={saving}
                            className="text-red-500 hover:text-red-700 text-xl"
                            title="Delete entry"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
