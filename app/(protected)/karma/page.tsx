"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { supabase } from "@/lib/supabaseClient";

type Tab = "karma" | "good_news" | "challenges";

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
  is_participating: boolean;
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

const pageBg: React.CSSProperties = {
  background: "linear-gradient(135deg, #fef7ff 0%, #fdf4ff 25%, #f3e8ff 50%, #e9d5ff 75%, #ddd6fe 100%)",
  minHeight: "100vh",
};

export default function KarmaCornerPage() {
  const [tab, setTab] = useState<Tab>("karma");
  const [userId, setUserId] = useState<string | null>(null);
  const [myName, setMyName] = useState<string>("You");

  // Composer states
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [region, setRegion] = useState("");
  const [reflection, setReflection] = useState("");
  const [showReflection, setShowReflection] = useState(false);
  const [posting, setPosting] = useState(false);

  // Feed states
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [reactionCounts, setReactionCounts] = useState<Record<string, ReactionCount>>({});
  const [myReactions, setMyReactions] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);

  const canPost = content.trim().length > 0 && !!userId;

  // Common tags for suggestions
  const commonTags = [
    "#RandomActsOfKindness", "#Community", "#LocalLove", "#PayItForward", 
    "#Gratitude", "#Helping", "#Inspiration", "#Kindness", "#GoodNews"
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
      // Load posts
      const { data: postsData, error: postsErr } = await supabase
        .from("kindness_posts")
        .select("id,created_by,post_type,content,photo_url,tags,region,is_anonymous,created_at")
        .eq("status", "published")
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
  }, [userId]);

  const loadChallenges = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: challengesData, error: challengesErr } = await supabase
        .from("kindness_challenges")
        .select(`
          id,title,description,start_at,end_at,tags,participant_count,
          kindness_challenge_participants!left(user_id)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (challengesErr) throw challengesErr;
      
      const processedChallenges = (challengesData ?? []).map((c: any) => ({
        ...c,
        is_participating: c.kindness_challenge_participants?.some((p: any) => p.user_id === userId) || false
      }));

      setChallenges(processedChallenges);
    } catch (e: any) {
      console.error("Error loading challenges:", e);
    }
  }, [userId]);

  useEffect(() => {
    loadPosts();
    loadChallenges();
  }, [loadPosts, loadChallenges]);

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

  const filteredPosts = useMemo(() => {
    if (tab === "challenges") return [];
    return posts.filter(p => p.post_type === tab);
  }, [posts, tab]);

  const filteredChallenges = useMemo(() => {
    if (tab !== "challenges") return [];
    return challenges;
  }, [challenges, tab]);

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
              ✨ A place where kindness grows
            </div>
            <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.6 }}>
              Share anonymous acts of kindness, discover uplifting stories, and join challenges that spread positivity. 
              Every post plants a seed of inspiration.
            </p>
          </section>

          {/* Tabs */}
          <div className="card" style={{ padding: 0, marginBottom: 20, overflow: "hidden", borderRadius: 16 }}>
            <div className="controls" style={{ gap: 0, margin: 0 }}>
              {[
                { id: "karma", label: "💫 Karma Acts", desc: "Anonymous kindness" },
                { id: "good_news", label: "🌈 Good News", desc: "Uplifting stories" },
                { id: "challenges", label: "🎯 Challenges", desc: "Join the movement" }
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

          {/* Content Based on Tab */}
          {tab !== "challenges" ? (
            <>
              {/* Composer */}
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
                    placeholder={
                      tab === "karma"
                        ? "What act of kindness did you do today? Share anonymously to inspire others..."
                        : "Share an uplifting story or positive news that brightened your day..."
                    }
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

                  {/* Anonymous toggle for Good News */}
                  {tab === "good_news" && (
                    <label className="checkbox" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                      />
                      <span>Post anonymously</span>
                    </label>
                  )}

                  {tab === "karma" && (
                    <div style={{ fontSize: 14, color: "#6b7280", fontStyle: "italic" }}>
                      💫 All karma posts are anonymous to keep the focus on kindness, not recognition
                    </div>
                  )}

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
                      {posting ? "Sharing..." : `✨ Share ${tab === "karma" ? "Kindness" : "Good News"}`}
                    </button>
                  </div>
                </div>
              </div>

              {/* Posts Feed */}
              <section className="stack" style={{ gap: 16 }}>
                {loading && <p style={{ textAlign: "center", color: "#6b7280" }}>Loading inspiring moments...</p>}
                {!loading && filteredPosts.length === 0 && (
                  <div 
                    className="card p-4" 
                    style={{ 
                      textAlign: "center", 
                      color: "#6b7280",
                      background: "rgba(255, 255, 255, 0.6)",
                      borderRadius: 16
                    }}
                  >
                    No posts yet. Be the first to share some {tab === "karma" ? "kindness" : "good news"}! ✨
                  </div>
                )}

                {filteredPosts.map((post) => {
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
                        <span>
                          {post.post_type === "karma" ? "💫" : "🌈"} {when} • {who}
                        </span>
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
          ) : (
            /* Challenges Section */
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
                <h3 style={{ margin: "0 0 8px 0", color: "#7c3aed" }}>🎯 Kindness Challenges</h3>
                <p style={{ margin: 0, color: "#6b7280" }}>
                  Join challenges to spread kindness and connect with others making a difference
                </p>
              </div>

              {challenges.length === 0 ? (
                <div className="card p-4" style={{ textAlign: "center", color: "#6b7280" }}>
                  No active challenges right now. Check back soon! 🌟
                </div>
              ) : (
                challenges.map((challenge) => (
                  <div
                    key={challenge.id}
                    className="card p-4"
                    style={{
                      background: "rgba(255, 255, 255, 0.8)",
                      backdropFilter: "blur(10px)",
                      borderRadius: 16,
                      border: challenge.is_participating ? "2px solid #7c3aed" : "1px solid rgba(139, 69, 19, 0.1)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <h4 style={{ margin: 0, color: "#374151", fontSize: 18 }}>{challenge.title}</h4>
                      {challenge.is_participating && (
                        <span style={{
                          padding: "4px 12px",
                          fontSize: 12,
                          background: "#7c3aed",
                          color: "white",
                          borderRadius: 16,
                          fontWeight: 600
                        }}>
                          Joined ✓
                        </span>
                      )}
                    </div>
                    
                    <p style={{ margin: "0 0 12px 0", color: "#6b7280", lineHeight: 1.6 }}>
                      {challenge.description}
                    </p>

                    <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 12 }}>
                      📅 {format(new Date(challenge.start_at), "MMM d")} - {format(new Date(challenge.end_at), "MMM d")}
                      <span style={{ marginLeft: 16 }}>
                        👥 {challenge.participant_count} participants
                      </span>
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

                    {!challenge.is_participating && (
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
                    )}
                  </div>
                ))
              )}
            </section>
          )}
        </div>
      </div>

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
