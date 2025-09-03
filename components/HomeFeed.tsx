// components/HomeFeed.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  createPostRPC, 
  uploadMediaToPost, 
  listPostMedia,
  inviteCollaborator 
} from "@/lib/collab-demo";

type FeedPost = {
  id: string;
  type: "post" | "event";
  caption: string | null;
  description: string | null;
  visibility: "private" | "friends" | "acquaintances" | "public";
  created_at: string;
  created_by: string;
  creator_name: string;
  creator_avatar: string | null;
  media: MediaItem[];
  collaborators: string[];
  comments: Comment[];
  reactions: Reaction[];
  // Event-specific fields
  event_title?: string;
  event_start?: string;
  event_location?: string;
  event_id?: string;
  can_add_to_calendar?: boolean;
};

type MediaItem = {
  id: string;
  storage_path: string;
  type: "image" | "video";
  url: string;
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_name: string;
  user_avatar: string | null;
};

type Reaction = {
  id: string;
  type: "like" | "heart" | "celebrate" | "zen";
  count: number;
  user_reacted: boolean;
};

// Reaction Component
function ReactionBar({ 
  postId, 
  reactions, 
  userId, 
  onReactionUpdate 
}: {
  postId: string;
  reactions: Reaction[];
  userId: string | null;
  onReactionUpdate: () => void;
}) {
  const [reacting, setReacting] = useState<string | null>(null);

  const reactionEmojis = {
    like: "👍",
    heart: "❤️", 
    celebrate: "🎉",
    zen: "🧘"
  };

  const handleReaction = async (type: keyof typeof reactionEmojis) => {
    if (!userId) return;
    
    setReacting(type);
    try {
      const existingReaction = reactions.find(r => r.type === type);
      
      if (existingReaction?.user_reacted) {
        // Remove reaction
        await supabase
          .from("post_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId)
          .eq("type", type);
      } else {
        // Add reaction  
        await supabase
          .from("post_reactions")
          .upsert({
            post_id: postId,
            user_id: userId,
            type: type
          });
      }
      
      onReactionUpdate();
    } catch (err) {
      console.error("Reaction failed:", err);
    } finally {
      setReacting(null);
    }
  };

  return (
    <div className="reaction-bar">
      {Object.entries(reactionEmojis).map(([type, emoji]) => {
        const reaction = reactions.find(r => r.type === type as any);
        const isActive = reaction?.user_reacted;
        const count = reaction?.count || 0;
        
        return (
          <button
            key={type}
            onClick={() => handleReaction(type as any)}
            disabled={reacting === type}
            className={`reaction-button ${isActive ? 'active' : ''}`}
          >
            <span className="reaction-emoji">{emoji}</span>
            {count > 0 && <span className="reaction-count">{count}</span>}
          </button>
        );
      })}
      
      <style jsx>{`
        .reaction-bar {
          display: flex;
          gap: 0.5rem;
          padding: 0.75rem 0;
          border-top: 1px solid rgba(0,0,0,0.1);
        }
        
        .reaction-button {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.375rem 0.75rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 1.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }
        
        .reaction-button:hover {
          background: #f3f4f6;
          transform: translateY(-1px);
        }
        
        .reaction-button.active {
          background: #8b5cf6;
          color: white;
          border-color: #8b5cf6;
        }
        
        .reaction-emoji {
          font-size: 1rem;
        }
        
        .reaction-count {
          font-weight: 500;
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}

// Event Card Component
function EventCard({ 
  event, 
  userId,
  onAddToCalendar 
}: {
  event: FeedPost;
  userId: string | null;
  onAddToCalendar: (eventId: string) => void;
}) {
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="event-card">
      <div className="event-header">
        <div className="event-icon">📅</div>
        <div className="event-info">
          <h3 className="event-title">{event.event_title}</h3>
          <div className="event-details">
            <div className="event-date">{formatEventDate(event.event_start!)}</div>
            {event.event_location && (
              <div className="event-location">📍 {event.event_location}</div>
            )}
          </div>
        </div>
        
        {event.can_add_to_calendar && (
          <button
            onClick={() => onAddToCalendar(event.event_id!)}
            className="add-to-calendar-btn"
          >
            Add to Calendar
          </button>
        )}
      </div>
      
      {event.description && (
        <div className="event-description">{event.description}</div>
      )}
      
      <div className="event-footer">
        <span className="event-creator">Shared by {event.creator_name}</span>
        <span className="event-visibility">{event.visibility}</span>
      </div>
      
      <style jsx>{`
        .event-card {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border: 1px solid #f59e0b;
          border-radius: 0.75rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        
        .event-header {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        
        .event-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        
        .event-info {
          flex: 1;
        }
        
        .event-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #92400e;
          margin: 0 0 0.25rem 0;
        }
        
        .event-details {
          font-size: 0.875rem;
          color: #b45309;
        }
        
        .event-date {
          font-weight: 500;
        }
        
        .event-location {
          margin-top: 0.25rem;
        }
        
        .add-to-calendar-btn {
          padding: 0.5rem 1rem;
          background: #f59e0b;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }
        
        .add-to-calendar-btn:hover {
          background: #d97706;
          transform: translateY(-1px);
        }
        
        .event-description {
          background: rgba(255,255,255,0.7);
          padding: 0.75rem;
          border-radius: 0.5rem;
          margin-bottom: 0.75rem;
          color: #92400e;
          line-height: 1.5;
        }
        
        .event-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          color: #b45309;
        }
        
        .event-creator {
          font-weight: 500;
        }
        
        .event-visibility {
          text-transform: capitalize;
          background: rgba(255,255,255,0.8);
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
        }
      `}</style>
    </div>
  );
}

// Create Post Component
function CreatePostComposer({ 
  userId, 
  onPostCreated 
}: {
  userId: string | null;
  onPostCreated: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [postType, setPostType] = useState<"post" | "event">("post");
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"friends" | "acquaintances" | "public">("friends");
  const [tags, setTags] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Event-specific fields
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;

    setSelectedFiles([...selectedFiles, ...newFiles]);
    const newUrls = newFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls([...previewUrls, ...newUrls]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles(files => files.filter((_, i) => i !== index));
    setPreviewUrls(urls => urls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setCreating(true);
    try {
      if (postType === "event") {
        // Create event and share to feed
        const startDateTime = `${eventDate}T${eventTime}`;
        const endDateTime = new Date(new Date(startDateTime).getTime() + 2 * 60 * 60 * 1000).toISOString();
        
        const { data: event, error } = await supabase
          .from("events")
          .insert({
            title: eventTitle,
            description: description,
            start_time: startDateTime,
            end_time: endDateTime,
            location: eventLocation,
            visibility: visibility === "friends" ? "friends" : "public",
            created_by: userId
          })
          .select()
          .single();
          
        if (error) throw error;

        // Create feed post for event
        await supabase
          .from("feed_posts")
          .insert({
            type: "event",
            event_id: event.id,
            visibility: visibility,
            created_by: userId
          });
      } else {
        // Create collaborative post
        const postId = await createPostRPC({
          caption: caption.trim(),
          description: description.trim() || null,
          visibility: visibility === "acquaintances" ? "friends" : visibility,
        });

        // Upload media if any
        if (selectedFiles.length > 0) {
          await uploadMediaToPost(postId, selectedFiles);
        }

        // Send collaboration invites
        const tagNames = tags.split(",").map(s => s.trim()).filter(Boolean);
        if (tagNames.length > 0) {
          try {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, full_name")
              .in("full_name", tagNames);

            if (profiles?.length) {
              for (const profile of profiles) {
                await inviteCollaborator(postId, profile.id);
              }
            }
          } catch (tagErr) {
            console.warn("Error sending collaboration invites:", tagErr);
          }
        }
      }

      // Reset form
      setCaption("");
      setDescription("");
      setTags("");
      setEventTitle("");
      setEventDate("");
      setEventTime("");
      setEventLocation("");
      setSelectedFiles([]);
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      setIsExpanded(false);
      
      onPostCreated();
    } catch (err: any) {
      alert(`Failed to create ${postType}: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  if (!userId) return null;

  return (
    <div className="create-post-composer">
      <div className="composer-header">
        <div className="post-type-tabs">
          <button
            onClick={() => setPostType("post")}
            className={`type-tab ${postType === "post" ? "active" : ""}`}
          >
            📸 Create Post
          </button>
          <button
            onClick={() => setPostType("event")}
            className={`type-tab ${postType === "event" ? "active" : ""}`}
          >
            📅 Share Event
          </button>
        </div>
      </div>

      {!isExpanded ? (
        <div 
          className="composer-prompt"
          onClick={() => setIsExpanded(true)}
        >
          {postType === "post" 
            ? "What's on your mind? Share photos, memories, or collaborate with friends..."
            : "Share an event with your community..."
          }
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="composer-form">
          {postType === "post" ? (
            <>
              {/* Media Upload */}
              <div className="media-section">
                <label className="media-upload-area">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileSelect}
                    className="media-input"
                  />
                  {selectedFiles.length === 0 ? (
                    <div className="upload-prompt">
                      <span className="upload-icon">📸</span>
                      <span>Add photos or videos</span>
                    </div>
                  ) : (
                    <div className="selected-media">
                      {previewUrls.map((url, index) => (
                        <div key={index} className="media-preview">
                          {selectedFiles[index].type.startsWith('video') ? (
                            <video src={url} className="preview-item" muted />
                          ) : (
                            <img src={url} alt="Preview" className="preview-item" />
                          )}
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="remove-media"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <div className="add-more-media">+</div>
                    </div>
                  )}
                </label>
              </div>

              {/* Caption */}
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                className="caption-input"
                maxLength={100}
                required
              />

              {/* Description */}
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell the story behind this moment..."
                className="description-textarea"
                rows={2}
                maxLength={500}
              />

              {/* Tags */}
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tag friends to collaborate (comma separated names)"
                className="tags-input"
              />
            </>
          ) : (
            <>
              {/* Event Fields */}
              <input
                type="text"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Event title"
                className="event-input"
                required
              />
              
              <div className="event-datetime">
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="event-date"
                  required
                />
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="event-time"
                  required
                />
              </div>

              <input
                type="text"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder="Location (optional)"
                className="event-input"
              />

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Event description..."
                className="description-textarea"
                rows={3}
                maxLength={500}
              />
            </>
          )}

          {/* Visibility */}
          <div className="composer-controls">
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
              className="visibility-select"
            >
              <option value="friends">👥 Friends</option>
              <option value="acquaintances">🌐 Acquaintances</option>
              <option value="public">🌍 Public</option>
            </select>

            <div className="composer-actions">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || (postType === "post" ? !caption.trim() : !eventTitle.trim())}
                className="create-btn"
              >
                {creating ? "Creating..." : postType === "post" ? "Create Post" : "Share Event"}
              </button>
            </div>
          </div>
        </form>
      )}

      <style jsx>{`
        .create-post-composer {
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.9));
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
          border: 1px solid rgba(139,92,246,0.2);
          backdrop-filter: blur(10px);
        }

        .composer-header {
          margin-bottom: 1rem;
        }

        .post-type-tabs {
          display: flex;
          gap: 0.5rem;
        }

        .type-tab {
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .type-tab.active {
          background: #8b5cf6;
          color: white;
          border-color: #8b5cf6;
        }

        .composer-prompt {
          padding: 1rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .composer-prompt:hover {
          background: #f3f4f6;
          border-color: #8b5cf6;
        }

        .composer-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .media-section {
          border: 2px dashed #d1d5db;
          border-radius: 0.75rem;
          padding: 1rem;
          text-align: center;
        }

        .media-upload-area {
          display: block;
          cursor: pointer;
        }

        .media-input {
          display: none;
        }

        .upload-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: #6b7280;
        }

        .upload-icon {
          font-size: 2rem;
        }

        .selected-media {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
        }

        .media-preview {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .preview-item {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .remove-media {
          position: absolute;
          top: 0.25rem;
          right: 0.25rem;
          background: rgba(0,0,0,0.7);
          color: white;
          border: none;
          border-radius: 50%;
          width: 1.25rem;
          height: 1.25rem;
          cursor: pointer;
          font-size: 0.75rem;
        }

        .add-more-media {
          width: 80px;
          height: 80px;
          border: 2px dashed #d1d5db;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          font-size: 1.5rem;
          cursor: pointer;
        }

        .caption-input, .tags-input, .event-input {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background: #f9fafb;
          font-size: 16px;
        }

        .description-textarea {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background: #f9fafb;
          resize: vertical;
          font-family: inherit;
          font-size: 16px;
        }

        .event-datetime {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }

        .event-date, .event-time {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background: #f9fafb;
          font-size: 16px;
        }

        .composer-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .visibility-select {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background: white;
        }

        .composer-actions {
          display: flex;
          gap: 0.5rem;
        }

        .cancel-btn {
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          cursor: pointer;
        }

        .create-btn {
          padding: 0.5rem 1rem;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
        }

        .create-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .composer-controls {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .composer-actions {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

// Main HomeFeed Component
export default function HomeFeed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "posts" | "events">("all");

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadFeed();
    }
  }, [userId, filter]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
  };

  const loadFeed = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Get user's relationship data for visibility filtering
      const { data: relationships } = await supabase
        .from("friendships")
        .select("friend_id, relationship_type")
        .eq("user_id", userId)
        .eq("status", "accepted");

      const friendIds = relationships?.map(r => r.friend_id) || [];
      const friendsOnly = relationships?.filter(r => r.relationship_type === "friend").map(r => r.friend_id) || [];
      
      // Load collaborative posts
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          id,
          caption,
          description,
          visibility,
          created_at,
          created_by,
          profiles!inner(full_name, avatar_url)
        `)
        .or(`visibility.eq.public,and(visibility.eq.friends,created_by.in.(${friendsOnly.join(",")}))`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (postsError) throw postsError;

      // Load events shared to feed
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select(`
          id,
          title,
          description,
          start_time,
          location,
          visibility,
          created_at,
          created_by,
          profiles!inner(full_name, avatar_url)
        `)
        .or(`visibility.eq.public,and(visibility.eq.friends,created_by.in.(${friendIds.join(",")}))`)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(10);

      if (eventsError) throw eventsError;

      // Combine and enrich posts and events
      const allFeedItems: FeedPost[] = [];

      // Process posts
      if (!filter || filter === "all" || filter === "posts") {
        for (const post of postsData || []) {
          const [mediaData, commentsData, reactionsData] = await Promise.all([
            loadPostMedia(post.id),
            loadPostComments(post.id),
            loadPostReactions(post.id, userId)
          ]);

          allFeedItems.push({
            id: post.id,
            type: "post",
            caption: post.caption,
            description: post.description,
            visibility: post.visibility,
            created_at: post.created_at,
            created_by: post.created_by,
            creator_name: (post.profiles as any)?.full_name || "Unknown",
            creator_avatar: (post.profiles as any)?.avatar_url,
            media: mediaData,
            collaborators: [], // TODO: Load collaborators
            comments: commentsData,
            reactions: reactionsData
          });
        }
      }

      // Process events
      if (!filter || filter === "all" || filter === "events") {
        for (const event of eventsData || []) {
          allFeedItems.push({
            id: `event-${event.id}`,
            type: "event",
            caption: null,
            description: event.description,
            visibility: event.visibility,
            created_at: event.created_at,
            created_by: event.created_by,
            creator_name: (event.profiles as any)?.full_name || "Unknown",
            creator_avatar: (event.profiles as any)?.avatar_url,
            media: [],
            collaborators: [],
            comments: [],
            reactions: [],
            event_title: event.title,
            event_start: event.start_time,
            event_location: event.location,
            event_id: event.id,
            can_add_to_calendar: true
          });
        }
      }

      // Sort by created_at
      allFeedItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setPosts(allFeedItems);
    } catch (err: any) {
      console.error("Error loading feed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const loadPostMedia = async (postId: string) => {
    try {
      const mediaData = await listPostMedia(postId);
      return await Promise.all(mediaData.map(async (media) => {
        const { data: urlData } = supabase.storage
          .from("post-media")
          .getPublicUrl(media.storage_path.replace("post-media/", ""));
        
        return {
          ...media,
          url: urlData.publicUrl
        };
      }));
    } catch (err) {
      return [];
    }
  };

  const loadPostComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from("post_comments")
        .select(`
          id,
          content,
          created_at,
          profiles!inner(full_name, avatar_url)
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
        .limit(5);

      if (error) throw error;

      return data?.map(comment => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        user_name: (comment.profiles as any)?.full_name || "Unknown",
        user_avatar: (comment.profiles as any)?.avatar_url
      })) || [];
    } catch (err) {
      return [];
    }
  };

  const loadPostReactions = async (postId: string, currentUserId: string) => {
    try {
      const { data, error } = await supabase
        .from("post_reactions")
        .select("type, user_id")
        .eq("post_id", postId);

      if (error) throw error;

      const reactionCounts: { [key: string]: { count: number; user_reacted: boolean } } = {
        like: { count: 0, user_reacted: false },
        heart: { count: 0, user_reacted: false },
        celebrate: { count: 0, user_reacted: false },
        zen: { count: 0, user_reacted: false }
      };

      data?.forEach(reaction => {
        if (reactionCounts[reaction.type]) {
          reactionCounts[reaction.type].count++;
          if (reaction.user_id === currentUserId) {
            reactionCounts[reaction.type].user_reacted = true;
          }
        }
      });

      return Object.entries(reactionCounts).map(([type, data]) => ({
        id: `${postId}-${type}`,
        type: type as any,
        count: data.count,
        user_reacted: data.user_reacted
      }));
    } catch (err) {
      return [];
    }
  };

  const handleAddToCalendar = async (eventId: string) => {
    try {
      const { data: event, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error) throw error;

      // Create calendar event for user
      const { error: calError } = await supabase
        .from("calendar_events")
        .upsert({
          user_id: userId,
          event_id: eventId,
          title: event.title,
          start_time: event.start_time,
          end_time: event.end_time,
          location: event.location,
          added_from_feed: true
        });

      if (calError) throw calError;

      alert("Event added to your calendar!");
    } catch (err: any) {
      alert(`Failed to add event: ${err.message}`);
    }
  };

  const formatDate = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="home-feed">
      {/* Create Post Composer */}
      <CreatePostComposer userId={userId} onPostCreated={loadFeed} />

      {/* Feed Filters */}
      <div className="feed-filters">
        <button
          onClick={() => setFilter("all")}
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
        >
          All Updates
        </button>
        <button
          onClick={() => setFilter("posts")}
          className={`filter-btn ${filter === "posts" ? "active" : ""}`}
        >
          Posts & Memories
        </button>
        <button
          onClick={() => setFilter("events")}
          className={`filter-btn ${filter === "events" ? "active" : ""}`}
        >
          Upcoming Events
        </button>
      </div>

      {/* Feed Content */}
      <div className="feed-content">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>Loading your feed...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🌟</div>
            <h3>Your feed is ready!</h3>
            <p>Create your first post or event to get started</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="feed-item">
              {post.type === "event" ? (
                <EventCard 
                  event={post}
                  userId={userId}
                  onAddToCalendar={handleAddToCalendar}
                />
              ) : (
                <div className="post-card">
                  {/* Post Header */}
                  <div className="post-header">
                    <div className="post-author">
                      {post.creator_avatar ? (
                        <img src={post.creator_avatar} alt="" className="author-avatar" />
                      ) : (
                        <div className="author-avatar-placeholder">
                          {post.creator_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="author-info">
                        <div className="author-name">{post.creator_name}</div>
                        <div className="post-time">{formatDate(post.created_at)}</div>
                      </div>
                    </div>
                    <div className="post-visibility-badge">
                      {post.visibility}
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="post-content">
                    {post.caption && (
                      <div className="post-caption">{post.caption}</div>
                    )}
                    {post.description && (
                      <div className="post-description">{post.description}</div>
                    )}

                    {/* Media Gallery */}
                    {post.media.length > 0 && (
                      <div className="media-gallery">
                        {post.media.length === 1 ? (
                          <div className="single-media">
                            {post.media[0].type === "video" ? (
                              <video src={post.media[0].url} controls className="media-item" />
                            ) : (
                              <img src={post.media[0].url} alt="" className="media-item" />
                            )}
                          </div>
                        ) : (
                          <div className={`multi-media grid-${Math.min(post.media.length, 4)}`}>
                            {post.media.slice(0, 4).map((media, index) => (
                              <div key={media.id} className="media-container">
                                {media.type === "video" ? (
                                  <video src={media.url} muted className="media-item" />
                                ) : (
                                  <img src={media.url} alt="" className="media-item" />
                                )}
                                {index === 3 && post.media.length > 4 && (
                                  <div className="media-overlay">
                                    <span>+{post.media.length - 4} more</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Collaborators */}
                    {post.collaborators.length > 0 && (
                      <div className="collaborators">
                        <span className="collab-icon">🤝</span>
                        With: {post.collaborators.join(", ")}
                      </div>
                    )}
                  </div>

                  {/* Reactions */}
                  <ReactionBar
                    postId={post.id}
                    reactions={post.reactions}
                    userId={userId}
                    onReactionUpdate={loadFeed}
                  />

                  {/* Comments Preview */}
                  {post.comments.length > 0 && (
                    <div className="comments-preview">
                      {post.comments.slice(0, 2).map(comment => (
                        <div key={comment.id} className="comment">
                          <span className="comment-author">{comment.user_name}</span>
                          <span className="comment-content">{comment.content}</span>
                        </div>
                      ))}
                      {post.comments.length > 2 && (
                        <div className="view-more-comments">
                          View all {post.comments.length} comments
                        </div>
                      )}
                    </div>
                  )}

                  {/* Comment Input */}
                  {userId && (
                    <div className="comment-input-section">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        className="comment-input"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            // Handle comment submission
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .home-feed {
          max-width: 600px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        .feed-filters {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          padding: 0.5rem;
          background: rgba(255,255,255,0.8);
          border-radius: 0.75rem;
          backdrop-filter: blur(10px);
        }

        .filter-btn {
          flex: 1;
          padding: 0.75rem 1rem;
          background: transparent;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          text-align: center;
        }

        .filter-btn.active {
          background: #8b5cf6;
          color: white;
          border-color: #8b5cf6;
        }

        .filter-btn:not(.active):hover {
          background: #f3f4f6;
        }

        .feed-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 3rem 0;
          color: #6b7280;
        }

        .loading-spinner {
          width: 1.5rem;
          height: 1.5rem;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #6b7280;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
          color: #374151;
        }

        .feed-item {
          width: 100%;
        }

        .post-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.9));
          border-radius: 1rem;
          overflow: hidden;
          border: 1px solid rgba(139,92,246,0.2);
          backdrop-filter: blur(10px);
          transition: all 0.2s ease;
        }

        .post-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }

        .post-header {
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid rgba(0,0,0,0.1);
        }

        .post-author {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .author-avatar {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          object-fit: cover;
        }

        .author-avatar-placeholder {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          background: #8b5cf6;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }

        .author-info {
          display: flex;
          flex-direction: column;
        }

        .author-name {
          font-weight: 600;
          color: #374151;
        }

        .post-time {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .post-visibility-badge {
          background: rgba(139,92,246,0.1);
          color: #8b5cf6;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          text-transform: capitalize;
          font-weight: 500;
        }

        .post-content {
          padding: 1rem;
        }

        .post-caption {
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #1f2937;
        }

        .post-description {
          color: #374151;
          line-height: 1.5;
          margin-bottom: 0.75rem;
        }

        .media-gallery {
          margin: 0.75rem 0;
        }

        .single-media {
          width: 100%;
        }

        .multi-media {
          display: grid;
          gap: 2px;
        }

        .grid-2 {
          grid-template-columns: 1fr 1fr;
        }

        .grid-3 {
          grid-template-columns: 2fr 1fr;
        }

        .grid-3 .media-container:first-child {
          grid-row: span 2;
        }

        .grid-4 {
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
        }

        .media-container {
          position: relative;
          overflow: hidden;
          aspect-ratio: 1;
          border-radius: 0.5rem;
        }

        .single-media .media-item {
          aspect-ratio: auto;
          border-radius: 0.5rem;
        }

        .media-item {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .media-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 500;
        }

        .collaborators {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
          font-size: 0.875rem;
          color: #8b5cf6;
          font-weight: 500;
        }

        .collab-icon {
          font-size: 1rem;
        }

        .comments-preview {
          padding: 0.75rem 1rem;
          border-top: 1px solid rgba(0,0,0,0.1);
          background: rgba(0,0,0,0.02);
        }

        .comment {
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .comment-author {
          font-weight: 500;
          color: #374151;
          margin-right: 0.5rem;
        }

        .comment-content {
          color: #4b5563;
        }

        .view-more-comments {
          color: #8b5cf6;
          font-size: 0.875rem;
          cursor: pointer;
          font-weight: 500;
        }

        .comment-input-section {
          padding: 1rem;
          border-top: 1px solid rgba(0,0,0,0.1);
        }

        .comment-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 1.5rem;
          background: #f9fafb;
          font-size: 0.875rem;
        }

        .comment-input:focus {
          outline: none;
          border-color: #8b5cf6;
          background: white;
        }

        .bottom-buttons {
          margin-top: 3rem;
          padding: 2rem 1rem;
          display: flex;
          justify-content: center;
          gap: 1rem;
          border-top: 1px solid rgba(139,92,246,0.2);
        }

        .nav-btn {
          padding: 0.75rem 1.5rem;
          background: rgba(255,255,255,0.8);
          color: #374151;
          text-decoration: none;
          border: 1px solid rgba(139,92,246,0.3);
          border-radius: 0.5rem;
          font-weight: 500;
          transition: all 0.2s ease;
          backdrop-filter: blur(10px);
        }

        .nav-btn:hover {
          background: rgba(255,255,255,0.95);
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(139,92,246,0.2);
        }

        .nav-btn-primary {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border-color: #8b5cf6;
        }

        .nav-btn-primary:hover {
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          box-shadow: 0 4px 12px rgba(139,92,246,0.3);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .home-feed {
            padding: 0 0.5rem;
          }

          .feed-filters {
            flex-direction: column;
            gap: 0.25rem;
          }

          .filter-btn {
            text-align: center;
          }

          .post-header {
            flex-direction: column;
            gap: 0.75rem;
            align-items: stretch;
          }

          .post-visibility-badge {
            align-self: flex-end;
          }
        }
      `}</style>
    </div>
  );
}
