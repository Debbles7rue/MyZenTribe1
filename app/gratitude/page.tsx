/* app/gratitude/page.tsx */
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function GratitudePage() {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Use URL hash to control what screen shows (bypasses React state issues)
  const showJournal = typeof window !== 'undefined' && window.location.hash === '#journal';

  const goToJournal = () => {
    window.location.hash = '#journal';
    window.location.reload(); // Force reload to ensure it works
  };

  const goToWelcome = () => {
    window.location.hash = '';
    window.location.reload();
  };

  // Journal content (always rendered, just hidden/shown with CSS)
  const journalContent = (
    <div style={{ 
      display: showJournal ? 'block' : 'none',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #E9D5FF 0%, #F3E8FF 50%, #FDF4FF 100%)',
      padding: '40px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '20px' }}>
        <h1>Your Gratitude Journal</h1>
        
        <div style={{ marginBottom: '30px' }}>
          <h3>Daily Reminder:</h3>
          <p>Feel it, don't just think it. Take a breath in for 4, out for 6.</p>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3>What are you grateful for today?</h3>
          <textarea
            style={{
              width: '100%',
              height: '150px',
              padding: '15px',
              fontSize: '16px',
              border: '2px solid #E9D5FF',
              borderRadius: '10px'
            }}
            placeholder="Write from the feeling in your body..."
            defaultValue=""
          />
        </div>

        <button
          onClick={() => alert('Entry saved locally! (Database not connected)')}
          style={{
            padding: '15px 30px',
            background: 'purple',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Save Entry
        </button>

        <button
          onClick={goToWelcome}
          style={{
            padding: '15px 30px',
            background: 'gray',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer'
          }}
        >
          Back to Welcome
        </button>
      </div>
    </div>
  );

  // Welcome content
  const welcomeContent = (
    <div style={{ 
      display: showJournal ? 'none' : 'block',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #E9D5FF 0%, #F3E8FF 50%, #FDF4FF 100%)',
      padding: '40px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '20px' }}>
        <h1>Gratitude Journal</h1>
        
        <div style={{ marginBottom: '30px' }}>
          <h2>The Science</h2>
          <p><strong>Your brain is naturally wired to notice the negative</strong>—it's part of how it keeps you safe. 
          But with just a little practice, you can retrain your mind to see the positives all around you.</p>
          
          <p>Each day, write down <strong>three things you're thankful for</strong>. Over time, these small daily 
          shifts rewire your brain, helping you create a more positive outlook and a deeper sense of well-being.</p>
        </div>

        <div style={{ 
          background: '#F3E8FF', 
          padding: '20px', 
          borderRadius: '10px',
          marginBottom: '30px'
        }}>
          <h3>🧠 The Key: Feel It, Don't Just Think It</h3>
          <p>Research shows that feeling gratitude activates your parasympathetic nervous system. 
          Simply listing things isn't enough—you need to pause and feel the sensation of appreciation in your body.</p>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3>How to Practice:</h3>
          <ol>
            <li>Close your eyes. Take a slow breath in for 4, out for 6.</li>
            <li><strong>Feel</strong> for a tiny lift in your body—a softening, warmth, or ease.</li>
            <li>Open your eyes and write from that sensation.</li>
            <li>Repeat up to 3 times daily.</li>
          </ol>
        </div>

        <div style={{ 
          background: userId ? '#10B981' : '#FCA5A5',
          padding: '15px',
          borderRadius: '10px',
          marginBottom: '20px',
          color: 'white'
        }}>
          <strong>Status:</strong> {userId ? '✅ Logged in - Ready to start' : '❌ Not logged in - Please login first'}
          {!userId && (
            <div style={{ marginTop: '10px' }}>
              <a href="/auth" style={{ color: 'white', textDecoration: 'underline' }}>
                Click here to login
              </a>
            </div>
          )}
        </div>

        {/* Multiple ways to navigate */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={goToJournal}
            style={{
              padding: '15px',
              background: 'purple',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            Begin Your Practice (Page Reload)
          </button>

          <a
            href="#journal"
            onClick={(e) => {
              e.preventDefault();
              goToJournal();
            }}
            style={{
              padding: '15px',
              background: 'blue',
              color: 'white',
              borderRadius: '10px',
              textAlign: 'center',
              textDecoration: 'none',
              display: 'block'
            }}
          >
            Begin Your Practice (Link Version)
          </a>

          <div
            onClick={goToJournal}
            style={{
              padding: '15px',
              background: 'green',
              color: 'white',
              borderRadius: '10px',
              textAlign: 'center',
              cursor: 'pointer'
            }}
          >
            Begin Your Practice (Div Click)
          </div>
        </div>

        <div style={{ marginTop: '20px', fontSize: '12px', color: 'gray' }}>
          Debug: If buttons don't work, manually add #journal to the URL and refresh
        </div>
      </div>
    </div>
  );

  return (
    <>
      {welcomeContent}
      {journalContent}
    </>
  );
}const THEMES: Record<ThemeKey, {
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

/** Mood emojis */
const MOOD_EMOJIS = {
  1: { emoji: "😔", label: "Struggling" },
  2: { emoji: "😕", label: "Challenging" },
  3: { emoji: "😌", label: "Neutral" },
  4: { emoji: "😊", label: "Good" },
  5: { emoji: "🥰", label: "Amazing" }
};

/** Tags */
const TAGS = [
  "gratitude", "family", "friends", "nature", "work", 
  "health", "creativity", "growth", "peace", "joy",
  "love", "achievement", "kindness", "beauty", "abundance"
];

/** Enhanced Quotes */
const QUOTES = [
  { text: "Gratitude turns what we have into enough.", author: "Anonymous" },
  { text: "The soul that gives thanks can find comfort in everything; the soul that complains can find comfort in nothing.", author: "Hannah Whitall Smith" },
  { text: "Gratitude is not only the greatest of virtues, but the parent of all the others.", author: "Marcus Tullius Cicero" },
  { text: "When we focus on our gratitude, the tide of disappointment goes out and the tide of love rushes in.", author: "Kristin Armstrong" },
  { text: "Gratitude makes sense of our past, brings peace for today, and creates a vision for tomorrow.", author: "Melody Beattie" },
  { text: "The more grateful I am, the more beauty I see.", author: "Mary Davis" },
  { text: "Gratitude is the fairest blossom which springs from the soul.", author: "Henry Ward Beecher" },
  { text: "Joy is the simplest form of gratitude.", author: "Karl Barth" },
  { text: "Gratitude unlocks the fullness of life. It turns what we have into enough, and more.", author: "Melody Beattie" },
  { text: "In ordinary life, we hardly realize that we receive a great deal more than we give.", author: "Dietrich Bonhoeffer" },
  { text: "The way to develop the best that is in a person is by appreciation and encouragement.", author: "Charles Schwab" },
  { text: "Be thankful for what you have; you'll end up having more.", author: "Oprah Winfrey" },
  { text: "This is a wonderful day. I have never seen this one before.", author: "Maya Angelou" },
  { text: "When you are grateful, fear disappears and abundance appears.", author: "Tony Robbins" },
  { text: "Gratitude is the wine for the soul. Go on. Get drunk.", author: "Rumi" },
  { text: "The roots of all goodness lie in the soil of appreciation.", author: "Dalai Lama" },
  { text: "Wear gratitude like a cloak and it will feed every corner of your life.", author: "Rumi" },
  { text: "Acknowledging the good that you already have in your life is the foundation for all abundance.", author: "Eckhart Tolle" },
  { text: "Gratitude is the healthiest of all human emotions.", author: "Zig Ziglar" }
];

/** ─── Main Component ─────────────────────────────────── */
export default function GratitudePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Settings & Theme
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>("lavender");
  
  // Entries
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const [entryType, setEntryType] = useState<EntryType>("glimmer");
  const [selectedMood, setSelectedMood] = useState<MoodLevel>(3);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // UI State
  const [showTimer, setShowTimer] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [stage, setStage] = useState<"loading" | "welcome" | "journal">("loading");
  
  // Timer
  const [timerSeconds, setTimerSeconds] = useState(600); // 10 minutes
  const [timerActive, setTimerActive] = useState(false);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");
  const todayEntries = entries.filter(e => e.entry_date === today);
  const glimmersToday = todayEntries.filter(e => e.entry_type === "glimmer").length;
  const canAddGlimmer = glimmersToday < 10; // Allow up to 10 glimmers per day

  // Load user data
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // Load settings and entries
  useEffect(() => {
    if (!userId) return;
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
        setSelectedTheme(settingsData.theme as ThemeKey);
        setStage("journal");
        
        // Check and update streak
        if (settingsData.last_entry_date !== today) {
          const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
          const newStreak = settingsData.last_entry_date === yesterday 
            ? (settingsData.streak_count || 0) + 1 
            : 1;
          
          await supabase
            .from("gratitude_settings")
            .update({ streak_count: newStreak, last_entry_date: today })
            .eq("user_id", userId);
        }
      } else {
        setStage("welcome");
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
      setError(e?.message || "Could not load your journal");
    } finally {
      setLoading(false);
    }
  }

  // Start journal
  async function startJournal() {
    if (!userId) return;
    setSaving(true);
    
    try {
      const newSettings: Settings = {
        user_id: userId,
        activated: true,
        recap_frequency: "weekly",
        theme: selectedTheme,
        streak_count: 0,
        last_entry_date: today
      };
      
      const { error } = await supabase
        .from("gratitude_settings")
        .upsert(newSettings, { onConflict: "user_id" });
      
      if (error) throw error;
      
      setSettings(newSettings);
      setStage("journal");
    } catch (e: any) {
      setError(e?.message || "Could not start journal");
    } finally {
      setSaving(false);
    }
  }

  // Add entry
  async function addEntry() {
    if (!userId || !draft.trim()) return;
    
    if (entryType === "glimmer" && !canAddGlimmer) {
      setError("You've reached 10 glimmers for today! Amazing work! 🌟");
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const newEntry = {
        user_id: userId,
        content: draft,
        entry_date: today,
        entry_type: entryType,
        mood: selectedMood,
        tags: selectedTags.length > 0 ? selectedTags : null,
        is_favorite: false
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
      
      // Update streak
      if (settings && settings.last_entry_date !== today) {
        await supabase
          .from("gratitude_settings")
          .update({ last_entry_date: today, streak_count: (settings.streak_count || 0) + 1 })
          .eq("user_id", userId);
      }
    } catch (e: any) {
      setError(e?.message || "Could not save entry");
    } finally {
      setSaving(false);
    }
  }

  // Delete entry
  async function deleteEntry(id: string) {
    if (!userId) return;
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

  // Share quote to feed
  async function shareQuote() {
    const quote = QUOTES[quoteIndex];
    const message = `"${quote.text}" — ${quote.author}\n\n#gratitude #inspiration`;
    
    // This would integrate with your feed system
    alert(`Quote ready to share:\n\n${message}\n\n(Integration with feed coming soon!)`);
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
  const theme = THEMES[settings?.theme || selectedTheme];

  // Current quote
  const currentQuote = QUOTES[quoteIndex % QUOTES.length];

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

  // Welcome screen
  if (stage === "welcome") {
    return (
      <div className="min-h-screen" style={{ background: THEMES.lavender.gradient }}>
        <SiteHeader />
        <div className="container mx-auto max-w-4xl px-4 py-12">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8 md:p-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Your Gratitude Journey Begins
              </h1>
              
              <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                Welcome to your private sanctuary of gratitude. This is your space to capture life's 
                glimmers—those tiny moments of beauty, joy, and peace that often go unnoticed. 
                No performance, no audience, just you and your thoughts.
              </p>

              <div className="bg-purple-50 rounded-2xl p-6 mb-8">
                <h3 className="font-semibold text-purple-900 mb-3">✨ What are Glimmers?</h3>
                <p className="text-purple-800">
                  Glimmers are micro-moments of joy—the opposite of triggers. They're the tiny things 
                  that make you feel calm, connected, or content. A warm cup of coffee, a text from a 
                  friend, sunlight through the window. Small, but powerful.
                </p>
              </div>

              <div className="mb-8">
                <h3 className="font-semibold mb-4">Choose Your Theme</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(Object.keys(THEMES) as ThemeKey[]).map(key => (
                    <button
                      key={key}
                      onClick={() => setSelectedTheme(key)}
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
              </div>

              <button
                onClick={startJournal}
                disabled={saving}
                className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50"
              >
                {saving ? "Starting..." : "Begin Your Journey"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main journal
  return (
    <div className="min-h-screen" style={{ background: theme.gradient }}>
      <SiteHeader />
      
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
          <Link href="/profile" className="btn btn-neutral mt-4 md:mt-0">
            Back to Profile
          </Link>
        </div>

        {/* Timer Modal */}
        {showTimer && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">Screen-Free Meditation</h2>
              <p className="text-gray-600 mb-6">
                Take a moment to disconnect and breathe. Notice the sensations in your body, 
                the sounds around you, the feeling of being present.
              </p>
              
              <div className="text-6xl font-bold text-center mb-6" style={{ color: theme.accent }}>
                {timerMinutes}:{timerSecs.toString().padStart(2, '0')}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={timerActive ? stopTimer : startTimer}
                  className="flex-1 py-3 rounded-xl font-semibold text-white"
                  style={{ background: theme.accent }}
                >
                  {timerActive ? "Pause" : "Start"}
                </button>
                <button
                  onClick={() => setShowTimer(false)}
                  className="flex-1 py-3 rounded-xl font-semibold border-2 border-gray-300"
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
            <div className="bg-white rounded-2xl p-6 shadow-lg" style={{ boxShadow: theme.glow }}>
              <h3 className="font-semibold text-gray-800 mb-4">Today's Inspiration</h3>
              <blockquote className="text-lg italic text-gray-700 mb-2">
                "{currentQuote.text}"
              </blockquote>
              <p className="text-gray-600 mb-4">— {currentQuote.author}</p>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setQuoteIndex(prev => prev + 1)}
                  className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Next Quote
                </button>
                <button
                  onClick={shareQuote}
                  className="py-2 px-4 rounded-lg text-white"
                  style={{ background: theme.accent }}
                >
                  Share
                </button>
              </div>
            </div>

            {/* Mindfulness Tools */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="font-semibold text-gray-800 mb-4">Mindfulness Tools</h3>
              
              <button
                onClick={() => setShowTimer(true)}
                className="w-full py-3 rounded-xl mb-3 text-white font-medium"
                style={{ background: theme.accent }}
              >
                🧘 10-Minute Meditation
              </button>
              
              <button
                onClick={() => setShowPrompts(!showPrompts)}
                className="w-full py-3 rounded-xl border-2 border-gray-200 font-medium hover:bg-gray-50 transition-colors"
              >
                💭 Show Prompts
              </button>
              
              {showPrompts && (
                <div className="mt-4 space-y-2">
                  {PROMPTS.slice(0, 5).map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setDraft(prompt)}
                      className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
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
            <div className="bg-white rounded-2xl p-6 shadow-lg">
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
                    : "Take your time. Reflect deeply on what you're grateful for today..."
                }
                rows={entryType === "glimmer" ? 3 : 6}
                className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none resize-none"
                style={{ borderColor: draft ? theme.border : undefined }}
              />

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

              {/* Submit Button */}
              <button
                onClick={addEntry}
                disabled={!draft.trim() || saving || (entryType === "glimmer" && !canAddGlimmer)}
                className="w-full mt-6 py-3 rounded-xl text-white font-semibold disabled:opacity-50 transition-all hover:shadow-lg"
                style={{ background: theme.accent }}
              >
                {saving ? "Saving..." : `Add ${entryType === "glimmer" ? "Glimmer" : "Entry"}`}
              </button>

              {error && (
                <div className="mt-4 p-4 rounded-xl bg-red-50 text-red-700">
                  {error}
                </div>
              )}
            </div>

            {/* Today's Entries */}
            {todayEntries.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="font-semibold text-gray-800 mb-4">Today's Gratitude</h3>
                <div className="space-y-3">
                  {todayEntries.map(entry => (
                    <div
                      key={entry.id}
                      className="p-4 rounded-xl transition-all hover:shadow-md"
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
                              {format(new Date(entry.created_at), "h:mm a")}
                            </span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{entry.content}</p>
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
                          >
                            {entry.is_favorite ? "⭐" : "☆"}
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            disabled={saving}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
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
    </div>
  );
}
