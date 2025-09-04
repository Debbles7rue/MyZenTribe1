"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { supabase } from "@/lib/supabaseClient";

type Tab = "karma" | "good_news";
type KarmaTab = "browse_challenges" | "my_challenges" | "create_challenge" | "all_acts";

type PostRow = {
  id: string;
  created_by: string;
  post_type: "karma" | "good_news";
  content: string;
  photo_url?: string;
  tags: string[];
  region?: string;
  is_anonymous: boolean;
  created_at: string;
};

type ChallengeRow = {
  id: string;
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  tags: string[];
  participant_count: number;
  success_count: number;
  is_participating: boolean;
  is_official: boolean;
  difficulty_level: "easy" | "medium" | "hard";
  estimated_time?: string;
  target_group?: string;
  created_by?: string;
};

type ReactionCount = {
  uplift: number;
  warmth: number;
  grateful: number;
  inspired: number;
};

const reactions = {
  uplift: { emoji: "🌟", label: "Uplift", description: "This lifted my spirits" },
  warmth: { emoji: "💖", label: "Warmth", description: "This warmed my heart" },
  grateful: { emoji: "🙏", label: "Grateful", description: "Thank you for sharing" },
  inspired: { emoji: "✨", label: "Inspired", description: "This motivates me" }
};

const difficultyColors = {
  easy: "#10b981",
  medium: "#f59e0b", 
  hard: "#ef4444"
};

const difficultyLabels = {
  easy: "Easy",
  medium: "Medium",
  hard: "Challenge"
};

const pageBg: React.CSSProperties = {
  background: "linear-gradient(135deg, #fef7ff 0%, #fdf4ff 25%, #f3e8ff 50%, #e9d5ff 75%, #ddd6fe 100%)",
  minHeight: "100vh",
};

export default function KarmaCornerPage() {
  const [tab, setTab] = useState<Tab>("karma");
  const [karmaTab, setKarmaTab] = useState<KarmaTab>("browse_challenges");
  const [userId, setUserId] = useState<string | null>(null);
  const [myName, setMyName] = useState<string>("You");

  // Composer states (always visible in Karma Corner)
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [region, setRegion] = useState("");
  const [reflection, setReflection] = useState("");
  const [showReflection, setShowReflection] = useState(false);
  const [posting, setPosting] = useState(false);

  // Challenge creation states
  const [newChallenge, setNewChallenge] = useState({
    title: "",
    description: "",
    duration_days: 7,
    difficulty_level: "medium" as "easy" | "medium" | "hard",
    estimated_time: "",
    target_group: "",
    tags: [] as string[]
  });
  const [creatingChallenge, setCreatingChallenge] = useState(false);

  // Challenge completion states
  const [showCompleteModal, setShowCompleteModal] = useState<string | null>(null);
  const [completionStory, setCompletionStory] = useState("");
  const [shareToGoodNews, setShareToGoodNews] = useState(true);

  // Feed states
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [myChallenges, setMyChallenges] = useState<ChallengeRow[]>([]);
  const [reactionCounts, setReactionCounts] = useState<Record<string, ReactionCount>>({});
  const [myReactions, setMyReactions] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);

  const canPost = content.trim().length > 0 && !!userId;
  const canCreateChallenge = newChallenge.title.trim().length > 0 && newChallenge.description.trim().length > 0;

  // Common tags for suggestions
  const commonTags = [
    "#RandomActsOfKindness", "#Community", "#LocalLove", "#PayItForward", 
    "#Gratitude", "#Helping", "#Inspiration", "#Kindness"
  ];

  const challengeTags = [
    "elderly", "homeless", "community", "environment", "pets", "veterans", 
    "first-responders", "neighbors", "technology", "food", "education", "health"
  ];

  const targetGroups = [
    "community", "elderly", "homeless", "veterans", "first-responders", 
    "students", "healthcare-workers", "environment", "animals", "neighbors"
  ];

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const prof = await supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle();
        if (!prof.error && prof.data?.full_name) setMyName(prof.data.full_name);
      }
    });
  }, []);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load posts based on current tab
      const postType = tab === "karma" ? "karma" : "good_news";
      const { data: postsData, error: postsErr } = await supabase
        .from("kindness_posts")
        .select("id,created_by,post_type,content,photo_url,tags,region,is_anonymous,created_at")
        .eq("status", "published")
        .eq("post_type", postType)
        .order("created_at", { ascending: false })
        .limit(200);
      
      if (postsErr) throw postsErr;
      setPosts((postsData ?? []) as PostRow[]);

      // Load reaction counts and my reactions
      if (postsData?.length) {
        const postIds = postsData.map(p => p.id);
        
        const [{ data: reactionsData }, { data: myReactionsData }] = await Promise.all([
          supabase
            .from("kindness_reactions")
            .select("post_id,reaction_type")
            .in("post_id", postIds),
          userId ? supabase
            .from("kindness_reactions")
            .select("post_id,reaction_type")
            .eq("user_id", userId)
            .in("post_id", postIds) : Promise.resolve({ data: [] })
        ]);

        // Process reaction counts
        const counts: Record<string, ReactionCount> = {};
        const myReacts: Record<string, string[]> = {};

        (reactionsData ?? []).forEach((r: any) => {
          if (!counts[r.post_id]) {
            counts[r.post_id] = { uplift: 0, warmth: 0, grateful: 0, inspired: 0 };
          }
          counts[r.post_id][r.reaction_type as keyof ReactionCount]++;
        });

        (myReactionsData ?? []).forEach((r: any) => {
          if (!myReacts[r.post_id]) myReacts[r.post_id] = [];
          myReacts[r.post_id].push(r.reaction_type);
        });

        setReactionCounts(counts);
        setMyReactions(myReacts);
      }
    } catch (e: any) {
      setError(e?.message || "Could not load posts.");
    } finally {
      setLoading(false);
    }
  }, [userId, tab]);

  const loadChallenges = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: challengesData, error: challengesErr } = await supabase
        .from("kindness_challenges")
        .select(`
          id,title,description,start_at,end_at,tags,participant_count,success_count,
          is_official,difficulty_level,estimated_time,target_group,created_by,
          kindness_challenge_participants!left(user_id)
        `)
        .eq("is_active", true)
        .eq("status", "approved")
        .order("is_official", { ascending: false })
        .order("created_at", { ascending: false });

      if (challengesErr) throw challengesErr;
      
      const processedChallenges = (challengesData ?? []).map((c: any) => ({
        ...c,
        is_participating: c.kindness_challenge_participants?.some((p: any) => p.user_id === userId) || false
      }));

      setChallenges(processedChallenges);

      // Load my challenges (ones I'm participating in or created)
      const myChallengesList = processedChallenges.filter((c: ChallengeRow) => 
        c.is_participating || c.created_by === userId
      );
      setMyChallenges(myChallengesList);
    } catch (e: any) {
      console.error("Error loading challenges:", e);
    }
  }, [userId]);

  useEffect(() => {
    loadPosts();
    if (tab === "karma") {
      loadChallenges();
    }
  }, [loadPosts, loadChallenges, tab]);

  const onPost = async () => {
    if (!canPost) return;
    setPosting(true);
    setError(null);
    
    try {
      const postData = {
        created_by: userId,
        post_type: tab === "karma" ? "karma" : "good_news",
        content: content.trim(),
        tags: selectedTags,
        region: region || null,
        is_anonymous: tab === "karma" ? true : isAnonymous,
        status: "published"
      };

      const { data, error: err } = await supabase
        .from("kindness_posts")
        .insert(postData)
        .select("id,created_by,post_type,content,photo_url,tags,region,is_anonymous,created_at")
        .single();
      
      if (err) throw err;
      if (data) {
        setPosts(prev => [data as PostRow, ...prev]);
        
        // Show reflection prompt for karma posts
        if (tab === "karma") {
          setShowReflection(true);
        }
      }
      
      // Reset form
      setContent("");
      setSelectedTags([]);
      setRegion("");
    } catch (e: any) {
      setError(e?.message || "Posting failed.");
    } finally {
      setPosting(false);
    }
  };

  const onCreateChallenge = async () => {
    if (!canCreateChallenge || !userId) return;
    setCreatingChallenge(true);
    
    try {
      const challengeData = {
        title: newChallenge.title.trim(),
        description: newChallenge.description.trim(),
        start_at: new Date().toISOString(),
        end_at: new Date(Date.now() + newChallenge.duration_days * 24 * 60 * 60 * 1000).toISOString(),
        tags: newChallenge.tags,
        created_by: userId,
        difficulty_level: newChallenge.difficulty_level,
        estimated_time: newChallenge.estimated_time || null,
        target_group: newChallenge.target_group || null,
        is_official: false,
        status: "approved"
      };

      const { error: err } = await supabase
        .from("kindness_challenges")
        .insert(challengeData);
      
      if (err) throw err;
      
      // Reset form
      setNewChallenge({
        title: "",
        description: "",
        duration_days: 7,
        difficulty_level: "medium",
        estimated_time: "",
        target_group: "",
        tags: []
      });
      
      // Switch to browse challenges to see the new one
      setKarmaTab("browse_challenges");
      
      // Reload challenges
      loadChallenges();
    } catch (e: any) {
      setError(e?.message || "Failed to create challenge.");
    } finally {
      setCreatingChallenge(false);
    }
  };

  const onCompleteChallenge = async (challengeId: string) => {
    if (!userId || !completionStory.trim()) return;
    
    try {
      // Mark challenge as completed in entries
      const { error: entryErr } = await supabase
        .from("kindness_entries")
        .upsert({
          challenge_id: challengeId,
          user_id: userId,
          is_completed: true,
          completion_story: completionStory.trim(),
          share_to_good_news: shareToGoodNews,
          completed_at: new Date().toISOString()
        });
      
      if (entryErr) throw entryErr;

      // If sharing to good news, create that post
      if (shareToGoodNews) {
        const challenge = challenges.find(c => c.id === challengeId);
        const goodNewsContent = `🎯 Challenge Complete: ${challenge?.title}\n\n${completionStory.trim()}`;
        
        const { error: goodNewsErr } = await supabase
          .from("kindness_posts")
          .insert({
            created_by: userId,
            post_type: "good_news",
            content: goodNewsContent,
            tags: ["#ChallengeComplete", ...(challenge?.tags.map(t => `#${t}`) || [])],
            is_anonymous: false,
            status: "published"
          });
        
        if (goodNewsErr) throw goodNewsErr;
      }

      // Update success count
      const { error: updateErr } = await supabase
        .from("kindness_challenges")
        .update({ success_count: (challenges.find(c => c.id === challengeId)?.success_count || 0) + 1 })
        .eq("id", challengeId);
      
      if (updateErr) console.error("Failed to update success count:", updateErr);

      // Close modal and refresh
      setShowCompleteModal(null);
      setCompletionStory("");
      setShareToGoodNews(true);
      loadChallenges();
      
    } catch (e: any) {
      console.error("Complete challenge error:", e);
      setError(e?.message || "Failed to complete challenge");
    }
  };

  const onReaction = async (postId: string, reactionType: keyof typeof reactions) => {
    if (!userId) return;
    
    const currentReactions = myReactions[postId] || [];
    const hasReaction = currentReactions.includes(reactionType);
    
    try {
      if (hasReaction) {
        // Remove reaction
        const { error } = await supabase
          .from("kindness_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId)
          .eq("reaction_type", reactionType);
        
        if (error) throw error;
        
        // Update local state
        setMyReactions(prev => ({
          ...prev,
          [postId]: prev[postId]?.filter(r => r !== reactionType) || []
        }));
        
        setReactionCounts(prev => ({
          ...prev,
          [postId]: {
            ...prev[postId],
            [reactionType]: Math.max((prev[postId]?.[reactionType] || 0) - 1, 0)
          }
        }));
      } else {
        // Add reaction
        const { error } = await supabase
          .from("kindness_reactions")
          .insert({
            post_id: postId,
            user_id: userId,
            reaction_type: reactionType
          });
        
        if (error) throw error;
        
        // Update local state
        setMyReactions(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), reactionType]
        }));
        
        setReactionCounts(prev => ({
          ...prev,
          [postId]: {
            ...prev[postId],
            [reactionType]: (prev[postId]?.[reactionType] || 0) + 1
          }
        }));
      }
    } catch (e: any) {
      console.error("Reaction error:", e);
    }
  };

  const onJoinChallenge = async (challengeId: string) => {
    if (!userId) return;
    
    try {
      const { error } = await supabase
        .from("kindness_challenge_participants")
        .insert({
          challenge_id: challengeId,
          user_id: userId
        });
      
      if (error) throw error;
      
      // Update local state
      setChallenges(prev => prev.map(c => 
        c.id === challengeId 
          ? { ...c, is_participating: true, participant_count: c.participant_count + 1 }
          : c
      ));
    } catch (e: any) {
      console.error("Join challenge error:", e);
    }
  };

  const onDeletePost = async (postId: string, createdBy: string) => {
    if (!userId || userId !== createdBy) return;
    if (!confirm("Delete this post?")) return;
    
    const { error } = await supabase.from("kindness_posts").delete().eq("id", postId);
    if (error) {
      alert(error.message || "Delete failed");
      return;
    }
    
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const addTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const addChallengeTag = (tag: string) => {
    if (!newChallenge.tags.includes(tag)) {
      setNewChallenge(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeChallengeTag = (tag: string) => {
    setNewChallenge(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const filteredChallenges = useMemo(() => {
    if (karmaTab === "my_challenges") return myChallenges;
    return challenges;
  }, [challenges, myChallenges, karmaTab]);

  return (
    <div className="page-wrap" style={pageBg}>
      <div className="page">
        <div className="container-app">
          {/* Header */}
          <div className="header-bar" style={{ marginBottom: 20 }}>
            <h1 className="page-title" style={{ marginBottom: 0, background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Karma Corner
            </h1>
            <div className="controls">
              <Link href="/profile" className="btn">
                Back to profile
              </Link>
            </div>
          </div>

          {/* Inspirational Quote */}
          <section 
            className="card p-4" 
            style={{ 
              marginBottom: 16, 
              background: "linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)",
              backdropFilter: "blur(10px)",
              border: "2px solid rgba(124, 58, 237, 0.2)",
              borderRadius: 16,
              textAlign: "center"
            }}
          >
            <div style={{ 
              fontSize: 20, 
              fontStyle: "italic", 
              fontWeight: 500, 
              background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)", 
              WebkitBackgroundClip: "text", 
              WebkitTextFillColor: "transparent",
              marginBottom: 4
            }}>
              "In a world where you can be anything — be kind"
            </div>
          </section>

          {/* Welcome Section */}
          <section 
            className="card p-4" 
            style={{ 
              marginBottom: 20, 
              background: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(139, 69, 19, 0.1)",
              borderRadius: 16
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 18 }}>
              ✨ Where kindness grows and movements begin
            </div>
            <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.6 }}>
              Join kindness challenges, share your acts anonymously, discover uplifting stories, and start your own movements. 
              Every action plants a seed of inspiration. ✨
            </p>
          </section>

          {/* Main Tabs */}
          <div className="card" style={{ padding: 0, marginBottom: 20, overflow: "hidden", borderRadius: 16 }}>
            <div className="controls" style={{ gap: 0, margin: 0 }}>
              {[
                { id: "karma", label: "💫 Karma Corner", desc: "Challenges & kindness acts" },
                { id: "good_news", label: "🌈 Good News", desc: "Uplifting stories" }
              ].map(({ id, label, desc }) => (
                <button
                  key={id}
                  className={`btn ${tab === id ? "btn-brand" : "btn-neutral"}`}
                  onClick={() => setTab(id as Tab)}
                  style={{
                    flex: 1,
                    borderRadius: 0,
                    padding: "16px 8px",
                    flexDirection: "column",
                    gap: 4,
                    border: "none",
                    background: tab === id 
                      ? "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)" 
                      : "rgba(255, 255, 255, 0.5)",
                    color: tab === id ? "white" : "#374151"
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {tab === "karma" ? (
            <>
              {/* Karma Sub-tabs */}
              <div className="card" style={{ padding: 0, marginBottom: 20, overflow: "hidden", borderRadius: 16 }}>
                <div className="controls" style={{ gap: 0, margin: 0 }}>
                  {[
                    { id: "browse_challenges", label: "🚀 Browse Challenges", desc: "Join the movement" },
                    { id: "my_challenges", label: "💪 My Challenges", desc: "Track progress" },
                    { id: "create_challenge", label: "✨ Create Challenge", desc: "Start a movement" },
                    { id: "all_acts", label: "💫 All Acts", desc: "See all kindness" }
                  ].map(({ id, label, desc }) => (
                    <button
                      key={id}
                      className={`btn ${karmaTab === id ? "btn-brand" : "btn-neutral"}`}
                      onClick={() => setKarmaTab(id as KarmaTab)}
                      style={{
                        flex: 1,
                        borderRadius: 0,
                        padding: "12px 4px",
                        flexDirection: "column",
                        gap: 2,
                        border: "none",
                        background: karmaTab === id 
                          ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" 
                          : "rgba(255, 255, 255, 0.5)",
                        color: karmaTab === id ? "white" : "#374151",
                        fontSize: 13
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{label}</div>
                      <div style={{ fontSize: 11, opacity: 0.8 }}>{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Always-Present Kindness Sharing Box */}
              <div 
                className="card p-4" 
                style={{ 
                  marginBottom: 20,
                  background: "rgba(124, 58, 237, 0.1)",
                  backdropFilter: "blur(10px)",
                  border: "2px solid rgba(124, 58, 237, 0.2)",
                  borderRadius: 16
                }}
              >
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 600, 
                  color: "#7c3aed",
                  marginBottom: 8
                }}>
                  💫 Share an Act of Kindness
                </div>
                <p style={{ margin: "0 0 16px 0", color: "#6b7280", fontSize: 14 }}>
                  Did a challenge, helped someone spontaneously, or just spread some kindness? Share it here! 
                  All acts are posted anonymously to keep the focus on kindness, not recognition.
                </p>

                <div className="stack" style={{ gap: 16 }}>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="What act of kindness did you do? Could be from a challenge or just something spontaneous..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    style={{
                      border: "2px solid #e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 14,
                      resize: "vertical"
                    }}
                  />

                  {/* Tags */}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Add tags (optional):</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                      {commonTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => addTag(tag)}
                          style={{
                            padding: "4px 8px",
                            fontSize: 12,
                            border: "1px solid #d1d5db",
                            borderRadius: 16,
                            background: selectedTags.includes(tag) ? "#7c3aed" : "white",
                            color: selectedTags.includes(tag) ? "white" : "#374151",
                            cursor: "pointer"
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    {selectedTags.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {selectedTags.map(tag => (
                          <span
                            key={tag}
                            style={{
                              padding: "4px 8px",
                              fontSize: 12,
                              background: "#7c3aed",
                              color: "white",
                              borderRadius: 16,
                              display: "flex",
                              alignItems: "center",
                              gap: 4
                            }}
                          >
                            {tag}
                            <button
                              onClick={() => removeTag(tag)}
                              style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Region */}
                  <input
                    type="text"
                    placeholder="Location/Region (optional)"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="input"
                    style={{
                      border: "2px solid #e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 14
                    }}
                  />

                  {error && (
                    <div style={{ 
                      padding: 12, 
                      background: "#fef2f2", 
                      border: "1px solid #fecaca", 
                      borderRadius: 8, 
                      color: "#dc2626", 
                      fontSize: 14 
                    }}>
                      {error}
                    </div>
                  )}

                  <div className="controls">
                    <button
                      className="btn btn-brand"
                      onClick={onPost}
                      disabled={!canPost || posting}
                      style={{
                        background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                        border: "none",
                        borderRadius: 12,
                        padding: "12px 24px",
                        fontWeight: 600
                      }}
                    >
                      {posting ? "Sharing..." : "✨ Share Kindness Anonymously"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Karma Tab Content */}
              {karmaTab === "create_challenge" ? (
                /* Create Challenge Form */
                <div 
                  className="card p-4"
                  style={{
                    background: "rgba(16, 185, 129, 0.1)",
                    backdropFilter: "blur(10px)",
                    borderRadius: 16,
                    marginBottom: 20,
                    border: "2px solid rgba(16, 185, 129, 0.2)"
                  }}
                >
                  <h3 style={{ margin: "0 0 16px 0", color: "#059669", fontSize: 20 }}>🚀 Create Your Own Challenge</h3>
                  <p style={{ margin: "0 0 20px 0", color: "#6b7280", lineHeight: 1.6 }}>
                    Start a movement! Create a challenge that could inspire your community to spread kindness.
                  </p>

                  <div className="stack" style={{ gap: 16 }}>
                    <input
                      type="text"
                      placeholder="Challenge title (e.g., 'Help 5 Elderly Neighbors This Week')"
                      value={newChallenge.title}
                      onChange={(e) => setNewChallenge(prev => ({ ...prev, title: e.target.value }))}
                      style={{
                        border: "2px solid #e5e7eb",
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 14,
                        fontWeight: 600
                      }}
                    />

                    <textarea
                      placeholder="Describe your challenge... What should people do? Why is this important? Any tips or resources?"
                      rows={4}
                      value={newChallenge.description}
                      onChange={(e) => setNewChallenge(prev => ({ ...prev, description: e.target.value }))}
                      style={{
                        border: "2px solid #e5e7eb",
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 14,
                        resize: "vertical"
                      }}
                    />

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, display: "block" }}>Duration:</label>
                        <select
                          value={newChallenge.duration_days}
                          onChange={(e) => setNewChallenge(prev => ({ ...prev, duration_days: Number(e.target.value) }))}
                          style={{
                            border: "2px solid #e5e7eb",
                            borderRadius: 12,
                            padding: 12,
                            fontSize: 14,
                            width: "100%"
                          }}
                        >
                          <option value={1}>1 day</option>
                          <option value={3}>3 days</option>
                          <option value={7}>1 week</option>
                          <option value={14}>2 weeks</option>
                          <option value={21}>3 weeks</option>
                          <option value={30}>1 month</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, display: "block" }}>Difficulty:</label>
                        <select
                          value={newChallenge.difficulty_level}
                          onChange={(e) => setNewChallenge(prev => ({ ...prev, difficulty_level: e.target.value as "easy" | "medium" | "hard" }))}
                          style={{
                            border: "2px solid #e5e7eb",
                            borderRadius: 12,
                            padding: 12,
                            fontSize: 14,
                            width: "100%"
                          }}
                        >
                          <option value="easy">Easy (5-15 mins)</option>
                          <option value="medium">Medium (30 mins - 1 hour)</option>
                          <option value="hard">Challenge (1+ hours)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <input
                        type="text"
                        placeholder="Time estimate (e.g., '30 minutes', '2 hours')"
                        value={newChallenge.estimated_time}
                        onChange={(e) => setNewChallenge(prev => ({ ...prev, estimated_time: e.target.value }))}
                        style={{
                          border: "2px solid #e5e7eb",
                          borderRadius: 12,
                          padding: 12,
                          fontSize: 14
                        }}
                      />

                      <select
                        value={newChallenge.target_group}
                        onChange={(e) => setNewChallenge(prev => ({ ...prev, target_group: e.target.value }))}
                        style={{
                          border: "2px solid #e5e7eb",
                          borderRadius: 12,
                          padding: 12,
                          fontSize: 14
                        }}
                      >
                        <option value="">Who does this help?</option>
                        {targetGroups.map(group => (
                          <option key={group} value={group}>{group}</option>
                        ))}
                      </select>
                    </div>

                    {/* Challenge Tags */}
                    <div>
                      <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: "block" }}>Tags (helps people find your challenge):</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                        {challengeTags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => addChallengeTag(tag)}
                            style={{
                              padding: "4px 8px",
                              fontSize: 12,
                              border: "1px solid #d1d5db",
                              borderRadius: 16,
                              background: newChallenge.tags.includes(tag) ? "#10b981" : "white",
                              color: newChallenge.tags.includes(tag) ? "white" : "#374151",
                              cursor: "pointer"
                            }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                      {newChallenge.tags.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {newChallenge.tags.map(tag => (
                            <span
                              key={tag}
                              style={{
                                padding: "4px 8px",
                                fontSize: 12,
                                background: "#10b981",
                                color: "white",
                                borderRadius: 16,
                                display: "flex",
                                alignItems: "center",
                                gap: 4
                              }}
                            >
                              {tag}
                              <button
                                onClick={() => removeChallengeTag(tag)}
                                style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="controls">
                      <button
                        onClick={onCreateChallenge}
                        disabled={!canCreateChallenge || creatingChallenge}
                        style={{
                          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          border: "none",
                          borderRadius: 12,
                          padding: "12px 24px",
                          color: "white",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        {creatingChallenge ? "Creating..." : "🚀 Launch Challenge"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : karmaTab === "all_acts" ? (
                /* All Kindness Acts Feed */
                <section className="stack" style={{ gap: 16 }}>
                  <div 
                    className="card p-4"
                    style={{
                      background: "rgba(255, 255, 255, 0.8)",
                      backdropFilter: "blur(10px)",
                      borderRadius: 16,
                      textAlign: "center"
                    }}
                  >
                    <h3 style={{ margin: "0 0 8px 0", color: "#7c3aed" }}>💫 All Acts of Kindness</h3>
                    <p style={{ margin: 0, color: "#6b7280" }}>
                      Every anonymous act of kindness shared by our community. Let these stories inspire your next good deed!
                    </p>
                  </div>

                  {loading && <p style={{ textAlign: "center", color: "#6b7280" }}>Loading inspiring moments...</p>}
                  {!loading && posts.length === 0 && (
                    <div 
                      className="card p-4" 
                      style={{ 
                        textAlign: "center", 
                        color: "#6b7280",
                        background: "rgba(255, 255, 255, 0.6)",
                        borderRadius: 16
                      }}
                    >
                      No acts of kindness shared yet. Be the first to inspire others! ✨
                    </div>
                  )}

                  {posts.map((post) => {
                    const when = format(new Date(post.created_at), "MMM d");
                    const postReactions = reactionCounts[post.id] || { uplift: 0, warmth: 0, grateful: 0, inspired: 0 };
                    const myPostReactions = myReactions[post.id] || [];
                    
                    return (
                      <article 
                        key={post.id} 
                        className="card p-4"
                        style={{
                          background: "rgba(255, 255, 255, 0.8)",
                          backdropFilter: "blur(10px)",
                          borderRadius: 16,
                          border: "1px solid rgba(139, 69, 19, 0.1)"
                        }}
                      >
                        <div style={{ 
                          fontSize: 13, 
                          color: "#9ca3af", 
                          marginBottom: 8,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                          <span>💫 {when} • Anonymous</span>
                          {userId === post.created_by && (
                            <button 
                              onClick={() => onDeletePost(post.id, post.created_by)}
                              style={{ 
                                background: "none", 
                                border: "none", 
                                color: "#9ca3af", 
                                cursor: "pointer",
                                fontSize: 12
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                        
                        <div style={{ 
                          whiteSpace: "pre-wrap", 
                          marginBottom: 12, 
                          lineHeight: 1.6,
                          color: "#374151"
                        }}>
                          {post.content}
                        </div>

                        {/* Tags */}
                        {post.tags.length > 0 && (
                          <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {post.tags.map(tag => (
                              <span
                                key={tag}
                                style={{
                                  padding: "2px 8px",
                                  fontSize: 11,
                                  background: "#f3f4f6",
                                  color: "#6b7280",
                                  borderRadius: 12
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Region */}
                        {post.region && (
                          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>
                            📍 {post.region}
                          </div>
                        )}

                        {/* Reactions */}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {Object.entries(reactions).map(([key, reaction]) => {
                            const count = postReactions[key as keyof ReactionCount];
                            const hasReacted = myPostReactions.includes(key);
                            
                            return (
                              <button
                                key={key}
                                onClick={() => onReaction(post.id, key as keyof typeof reactions)}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: 12,
                                  border: hasReacted ? "2px solid #7c3aed" : "1px solid #e5e7eb",
                                  borderRadius: 20,
                                  background: hasReacted ? "#f3f4f6" : "white",
                                  color: "#374151",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  transition: "all 0.2s ease"
                                }}
                                title={reaction.description}
                              >
                                <span>{reaction.emoji}</span>
                                <span>{reaction.label}</span>
                                {count > 0 && <span>({count})</span>}
                              </button>
                            );
                          })}
                        </div>
                      </article>
                    );
                  })}
                </section>
              ) : (
                /* Challenges Section */
                <section className="stack" style={{ gap: 16 }}>
                  {karmaTab === "browse_challenges" && (
                    <div 
                      className="card p-4"
                      style={{
                        background: "rgba(16, 185, 129, 0.1)",
                        backdropFilter: "blur(10px)",
                        borderRadius: 16,
                        textAlign: "center",
                        border: "1px solid rgba(16, 185, 129, 0.2)"
                      }}
                    >
                      <h3 style={{ margin: "0 0 8px 0", color: "#059669", fontSize: 18 }}>🚀 Ready to join a kindness challenge?</h3>
                      <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.6 }}>
                        Join structured challenges, make a difference, and share your success in the box above! 
                        Every completed challenge can inspire others. 🌟
                      </p>
                    </div>
                  )}

                  {karmaTab === "my_challenges" && (
                    <div 
                      className="card p-4"
                      style={{
                        background: "rgba(124, 58, 237, 0.1)",
                        backdropFilter: "blur(10px)",
                        borderRadius: 16,
                        textAlign: "center",
                        border: "1px solid rgba(124, 58, 237, 0.2)"
                      }}
                    >
                      <h3 style={{ margin: "0 0 8px 0", color: "#7c3aed", fontSize: 18 }}>💪 Your Kindness Journey</h3>
                      <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.6 }}>
                        Track challenges you've joined. When you complete one, share your story in the kindness box above to inspire the community!
                      </p>
                    </div>
                  )}

                  {filteredChallenges.length === 0 ? (
                    <div className="card p-4" style={{ textAlign: "center", color: "#6b7280" }}>
                      {karmaTab === "my_challenges" 
                        ? "No challenges joined yet. Browse some challenges to get started! 🌟"
                        : "No active challenges right now. Create your own to get things started! 🚀"
                      }
                    </div>
                  ) : (
                    filteredChallenges.map((challenge) => (
                      <div
                        key={challenge.id}
                        className="card p-4"
                        style={{
                          background: "rgba(255, 255, 255, 0.8)",
                          backdropFilter: "blur(10px)",
                          borderRadius: 16,
                          border: challenge.is_participating ? "2px solid #10b981" : "1px solid rgba(139, 69, 19, 0.1)"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <h4 style={{ margin: 0, color: "#374151", fontSize: 18 }}>{challenge.title}</h4>
                              {challenge.is_official && (
                                <span style={{
                                  padding: "2px 6px",
                                  fontSize: 10,
                                  background: "#7c3aed",
                                  color: "white",
                                  borderRadius: 8,
                                  fontWeight: 600
                                }}>
                                  OFFICIAL
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {challenge.is_participating && (
                              <span style={{
                                padding: "4px 12px",
                                fontSize: 12,
                                background: "#10b981",
                                color: "white",
                                borderRadius: 16,
                                fontWeight: 600
                              }}>
                                Joined ✓
                              </span>
                            )}
                            
                            <span style={{
                              padding: "4px 8px",
                              fontSize: 11,
                              background: difficultyColors[challenge.difficulty_level],
                              color: "white",
                              borderRadius: 12,
                              fontWeight: 600
                            }}>
                              {difficultyLabels[challenge.difficulty_level]}
                            </span>
                          </div>
                        </div>
                        
                        <p style={{ margin: "0 0 12px 0", color: "#6b7280", lineHeight: 1.6 }}>
                          {challenge.description}
                        </p>

                        <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 16 }}>
                          <span>📅 {format(new Date(challenge.start_at), "MMM d")} - {format(new Date(challenge.end_at), "MMM d")}</span>
                          <span>👥 {challenge.participant_count} joined</span>
                          <span>🎉 {challenge.success_count} completed</span>
                          {challenge.estimated_time && <span>⏱️ {challenge.estimated_time}</span>}
                          {challenge.target_group && <span>🎯 {challenge.target_group}</span>}
                        </div>

                        {challenge.tags.length > 0 && (
                          <div style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {challenge.tags.map(tag => (
                              <span
                                key={tag}
                                style={{
                                  padding: "4px 8px",
                                  fontSize: 11,
                                  background: "#f3f4f6",
                                  color: "#6b7280",
                                  borderRadius: 12
                                }}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          {!challenge.is_participating ? (
                            <button
                              onClick={() => onJoinChallenge(challenge.id)}
                              style={{
                                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                border: "none",
                                borderRadius: 12,
                                padding: "10px 20px",
                                color: "white",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontSize: 14
                              }}
                            >
                              🚀 Join Challenge
                            </button>
                          ) : (
                            <button
                              onClick={() => setShowCompleteModal(challenge.id)}
                              style={{
                                background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                                border: "none",
                                borderRadius: 12,
                                padding: "10px 20px",
                                color: "white",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontSize: 14
                              }}
                            >
                              ✅ Mark Complete
                            </button>
                          )}
                          
                          {challenge.created_by === userId && (
                            <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>
                              Your Challenge 🌟
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </section>
              )}
            </>
          ) : (
            /* Good News Tab */
            <>
              {/* Good News guidance */}
              <div 
                className="card p-3" 
                style={{ 
                  marginBottom: 16,
                  background: "rgba(16, 185, 129, 0.1)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  borderRadius: 12
                }}
              >
                <div style={{ 
                  fontSize: 15, 
                  fontWeight: 600, 
                  color: "#059669",
                  marginBottom: 4
                }}>
                  🌈 Got some uplifting news to brighten everyone's day?
                </div>
                <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
                  Share positive stories, good news, and uplifting moments that made you smile.
                </p>
              </div>

              {/* Good News Composer */}
              <div 
                className="card p-4" 
                style={{ 
                  marginBottom: 20,
                  background: "rgba(255, 255, 255, 0.8)",
                  backdropFilter: "blur(10px)",
                  borderRadius: 16
                }}
              >
                <div className="stack" style={{ gap: 16 }}>
                  <textarea
                    className="input"
                    rows={4}
                    placeholder="Share an uplifting story or positive news that brightened your day..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    style={{
                      border: "2px solid #e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 14,
                      resize: "vertical"
                    }}
                  />

                  {/* Tags */}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Add tags (optional):</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                      {["#GoodNews", "#Uplifting", "#Inspiring", "#Community", "#Hope", "#Joy"].map(tag => (
                        <button
                          key={tag}
                          onClick={() => addTag(tag)}
                          style={{
                            padding: "4px 8px",
                            fontSize: 12,
                            border: "1px solid #d1d5db",
                            borderRadius: 16,
                            background: selectedTags.includes(tag) ? "#10b981" : "white",
                            color: selectedTags.includes(tag) ? "white" : "#374151",
                            cursor: "pointer"
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    {selectedTags.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {selectedTags.map(tag => (
                          <span
                            key={tag}
                            style={{
                              padding: "4px 8px",
                              fontSize: 12,
                              background: "#10b981",
                              color: "white",
                              borderRadius: 16,
                              display: "flex",
                              alignItems: "center",
                              gap: 4
                            }}
                          >
                            {tag}
                            <button
                              onClick={() => removeTag(tag)}
                              style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Region */}
                  <input
                    type="text"
                    placeholder="Location/Region (optional)"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="input"
                    style={{
                      border: "2px solid #e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 14
                    }}
                  />

                  {/* Anonymous toggle for Good News */}
                  <label className="checkbox" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                    />
                    <span>Post anonymously</span>
                  </label>

                  {error && (
                    <div style={{ 
                      padding: 12, 
                      background: "#fef2f2", 
                      border: "1px solid #fecaca", 
                      borderRadius: 8, 
                      color: "#dc2626", 
                      fontSize: 14 
                    }}>
                      {error}
                    </div>
                  )}

                  <div className="controls">
                    <button
                      className="btn btn-brand"
                      onClick={onPost}
                      disabled={!canPost || posting}
                      style={{
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        border: "none",
                        borderRadius: 12,
                        padding: "12px 24px",
                        fontWeight: 600
                      }}
                    >
                      {posting ? "Sharing..." : "🌈 Share Good News"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Good News Feed */}
              <section className="stack" style={{ gap: 16 }}>
                {loading && <p style={{ textAlign: "center", color: "#6b7280" }}>Loading uplifting stories...</p>}
                {!loading && posts.length === 0 && (
                  <div 
                    className="card p-4" 
                    style={{ 
                      textAlign: "center", 
                      color: "#6b7280",
                      background: "rgba(255, 255, 255, 0.6)",
                      borderRadius: 16
                    }}
                  >
                                          No good news yet. Be the first to share something uplifting! 🌻
                  </div>
                )}

                {posts.map((post) => {
                  const when = format(new Date(post.created_at), "MMM d");
                  const who = post.is_anonymous ? "Anonymous" : myName;
                  const postReactions = reactionCounts[post.id] || { uplift: 0, warmth: 0, grateful: 0, inspired: 0 };
                  const myPostReactions = myReactions[post.id] || [];
                  
                  return (
                    <article 
                      key={post.id} 
                      className="card p-4"
                      style={{
                        background: "rgba(255, 255, 255, 0.8)",
                        backdropFilter: "blur(10px)",
                        borderRadius: 16,
                        border: "1px solid rgba(139, 69, 19, 0.1)"
                      }}
                    >
                      <div style={{ 
                        fontSize: 13, 
                        color: "#9ca3af", 
                        marginBottom: 8,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <span>🌈 {when} • {who}</span>
                        {userId === post.created_by && (
                          <button 
                            onClick={() => onDeletePost(post.id, post.created_by)}
                            style={{ 
                              background: "none", 
                              border: "none", 
                              color: "#9ca3af", 
                              cursor: "pointer",
                              fontSize: 12
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      
                      <div style={{ 
                        whiteSpace: "pre-wrap", 
                        marginBottom: 12, 
                        lineHeight: 1.6,
                        color: "#374151"
                      }}>
                        {post.content}
                      </div>

                      {/* Tags */}
                      {post.tags.length > 0 && (
                        <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {post.tags.map(tag => (
                            <span
                              key={tag}
                              style={{
                                padding: "2px 8px",
                                fontSize: 11,
                                background: "#f3f4f6",
                                color: "#6b7280",
                                borderRadius: 12
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Region */}
                      {post.region && (
                        <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>
                          📍 {post.region}
                        </div>
                      )}

                      {/* Reactions */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {Object.entries(reactions).map(([key, reaction]) => {
                          const count = postReactions[key as keyof ReactionCount];
                          const hasReacted = myPostReactions.includes(key);
                          
                          return (
                            <button
                              key={key}
                              onClick={() => onReaction(post.id, key as keyof typeof reactions)}
                              style={{
                                padding: "6px 12px",
                                fontSize: 12,
                                border: hasReacted ? "2px solid #7c3aed" : "1px solid #e5e7eb",
                                borderRadius: 20,
                                background: hasReacted ? "#f3f4f6" : "white",
                                color: "#374151",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                transition: "all 0.2s ease"
                              }}
                              title={reaction.description}
                            >
                              <span>{reaction.emoji}</span>
                              <span>{reaction.label}</span>
                              {count > 0 && <span>({count})</span>}
                            </button>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </section>
            </>
          )}
        </div>
      </div>

      {/* Challenge Completion Modal */}
      {showCompleteModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: "white",
            borderRadius: 20,
            padding: 24,
            maxWidth: 500,
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
          }}>
            <h3 style={{ margin: "0 0 16px 0", color: "#10b981" }}>🎉 Challenge Complete!</h3>
            <p style={{ margin: "0 0 16px 0", color: "#6b7280", lineHeight: 1.6 }}>
              Amazing work! Tell us how it went and inspire others with your story:
            </p>
            <textarea
              placeholder="Tell your story... How did it go? What did you learn? How did it feel to help?"
              value={completionStory}
              onChange={(e) => setCompletionStory(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                border: "2px solid #e5e7eb",
                borderRadius: 12,
                padding: 12,
                fontSize: 14,
                resize: "vertical",
                marginBottom: 16
              }}
            />
            
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <input
                type="checkbox"
                checked={shareToGoodNews}
                onChange={(e) => setShareToGoodNews(e.target.checked)}
              />
              <span style={{ fontSize: 14 }}>✨ Share this success story in Good News to inspire others!</span>
            </label>
            
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowCompleteModal(null);
                  setCompletionStory("");
                  setShareToGoodNews(true);
                }}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  background: "white",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => onCompleteChallenge(showCompleteModal)}
                disabled={!completionStory.trim()}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: 8,
                  background: completionStory.trim() ? "#10b981" : "#9ca3af",
                  color: "white",
                  cursor: completionStory.trim() ? "pointer" : "not-allowed",
                  fontWeight: 600
                }}
              >
                🎉 Complete Challenge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reflection Modal */}
      {showReflection && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: "white",
            borderRadius: 20,
            padding: 24,
            maxWidth: 500,
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
          }}>
            <h3 style={{ margin: "0 0 16px 0", color: "#7c3aed" }}>✨ How did that feel?</h3>
            <p style={{ margin: "0 0 16px 0", color: "#6b7280", lineHeight: 1.6 }}>
              Take a moment to reflect on your act of kindness. How did it make you feel?
            </p>
            <textarea
              placeholder="This made me feel..."
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              style={{
                width: "100%",
                height: 80,
                border: "2px solid #e5e7eb",
                borderRadius: 12,
                padding: 12,
                fontSize: 14,
                resize: "vertical",
                marginBottom: 16
              }}
            />
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowReflection(false);
                  setReflection("");
                }}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  background: "white",
                  cursor: "pointer"
                }}
              >
                Skip
              </button>
              <button
                onClick={() => {
                  // Here you could save the reflection to a journal or notes
                  setShowReflection(false);
                  setReflection("");
                }}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: 8,
                  background: "#7c3aed",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                Save Reflection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
