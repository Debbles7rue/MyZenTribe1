// components/PhotosFeed.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type MediaFile = {
  id: string;
  url: string;
  path: string;
  type: 'image' | 'video';
};

type Post = {
  id: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  profile_type?: 'personal' | 'business';
  business_id?: string | null;
  business_name?: string;
  business_logo?: string;
  caption: string | null;
  description: string | null;
  visibility: "private" | "friends" | "acquaintances" | "public";
  created_at: string;
  updated_at: string;
  tags: { id: string; name: string; can_edit?: boolean; status?: string }[];
  media_files: MediaFile[];
};

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  body: string;
  created_at: string;
};

type RelationshipType = 'friend' | 'acquaintance' | 'restricted' | 'none';

interface PhotosFeedProps {
  userId: string | null;
  viewerUserId?: string | null;
  isPublicView?: boolean;
  relationshipType?: RelationshipType;
  profileType?: 'personal' | 'business';
  businessId?: string | null;
}

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private (Only me)", icon: "🔒" },
  { value: "friends", label: "Friends", icon: "👥" },
  { value: "acquaintances", label: "Friends & Acquaintances", icon: "🤝" },
  { value: "public", label: "Public (Everyone)", icon: "🌍" },
] as const;

const BUSINESS_VISIBILITY_OPTIONS = [
  { value: "private", label: "Private (Only us)", icon: "🔒" },
  { value: "public", label: "Public (All Followers)", icon: "🌍" },
] as const;

export default function PhotosFeed({ 
  userId, 
  viewerUserId, 
  isPublicView = false,
  relationshipType = 'none',
  profileType = 'personal',
  businessId = null
}: PhotosFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<Post["visibility"]>("friends");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editVisibility, setEditVisibility] = useState<Post["visibility"]>("friends");
  const [editFiles, setEditFiles] = useState<FileList | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<{ [postId: string]: string }>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [expandedMedia, setExpandedMedia] = useState<Set<string>>(new Set());
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<{ [postId: string]: number }>({});
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [addingToPost, setAddingToPost] = useState<string | null>(null);

  // Determine if current user can post
  const canPost = useMemo(() => {
    if (profileType === 'business') {
      return !isPublicView && userId && userId === viewerUserId && businessId;
    }
    return !isPublicView && userId && userId === viewerUserId;
  }, [userId, viewerUserId, isPublicView, profileType, businessId]);

  // Check if user can edit a post
  const canEditPost = (post: Post) => {
    if (!viewerUserId) return false;
    if (post.user_id === viewerUserId) return true;
    const taggedUser = post.tags?.find(t => t.id === viewerUserId);
    return !!(taggedUser?.can_edit && taggedUser?.status === 'accepted');
  };

  // Check if user can add photos to post
  const canAddPhotos = (post: Post) => {
    if (!viewerUserId) return false;
    if (post.user_id === viewerUserId) return true;
    const taggedUser = post.tags?.find(t => t.id === viewerUserId);
    return !!(taggedUser?.can_edit && taggedUser?.status === 'accepted');
  };

  // Check if user can delete
  const canDeletePost = (post: Post) => {
    return viewerUserId && post.user_id === viewerUserId;
  };

  const isOwnProfile = userId === viewerUserId;

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const filterPostsByRelationship = (posts: Post[]): Post[] => {
    if (isOwnProfile) return posts;
    if (profileType === 'business') {
      return posts.filter(post => post.visibility === 'public');
    }
    return posts.filter(post => {
      switch (post.visibility) {
        case 'public': return true;
        case 'acquaintances': return relationshipType === 'friend' || relationshipType === 'acquaintance';
        case 'friends': return relationshipType === 'friend';
        case 'private': return false;
        default: return false;
      }
    });
  };

  async function listPosts() {
    if (!userId && !businessId) return setPosts([]);

    try {
      let allPosts: any[] = [];

      if (profileType === 'business' && businessId) {
        const { data: businessPosts, error: bizError } = await supabase
          .from("posts")
          .select(`
            id, user_id, business_id, profile_type,
            caption, description, visibility,
            created_at, updated_at
          `)
          .eq("business_id", businessId)
          .eq("profile_type", "business")
          .order("created_at", { ascending: false });

        if (bizError) throw bizError;

        const { data: bizInfo } = await supabase
          .from("profiles")
          .select("business_name, business_logo_url")
          .eq("id", userId)
          .single();

        allPosts = (businessPosts || []).map(post => ({
          ...post,
          business_name: bizInfo?.business_name || 'Business',
          business_logo: bizInfo?.business_logo_url
        }));
      } else {
        const { data: createdPosts, error: createdError } = await supabase
          .from("photo_posts")
          .select(`
            id, user_id, caption, description, 
            visibility, created_at, updated_at
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (createdError) throw createdError;

        const { data: taggedPostIds, error: tagError } = await supabase
          .from("photo_tags")
          .select("post_id")
          .eq("tagged_user_id", userId)
          .eq("status", "accepted");

        if (!tagError && taggedPostIds?.length) {
          const { data: taggedPosts } = await supabase
            .from("photo_posts")
            .select(`
              id, user_id, caption, description, 
              visibility, created_at, updated_at
            `)
            .in("id", taggedPostIds.map(t => t.post_id));

          if (taggedPosts) {
            allPosts = [...(createdPosts || []), ...taggedPosts];
          } else {
            allPosts = createdPosts || [];
          }
        } else {
          allPosts = createdPosts || [];
        }
      }

      const uniquePosts = Array.from(new Map(allPosts.map(p => [p.id, p])).values());

      const items = await Promise.all(uniquePosts.map(async (r) => {
        const { data: creator } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", r.user_id)
          .single();

        const { data: mediaFiles } = await supabase
          .from("post_media")
          .select("id, storage_path, type, sort_order")
          .eq("post_id", r.id)
          .order("sort_order", { ascending: true });

        const processedMedia: MediaFile[] = [];
        if (mediaFiles && mediaFiles.length > 0) {
          for (const media of mediaFiles) {
            const { data: mediaUrl } = supabase.storage
              .from("event-photos")
              .getPublicUrl(media.storage_path);
            processedMedia.push({
              id: media.id,
              url: mediaUrl.publicUrl,
              path: media.storage_path,
              type: media.type as 'image' | 'video'
            });
          }
        }
        
        const { data: tagsRows } = await supabase
          .from("photo_tags")
          .select("tagged_user_id, can_edit, status")
          .eq("post_id", r.id);

        let taggedUsers: { id: string; name: string; can_edit?: boolean; status?: string }[] = [];
        if (tagsRows?.length) {
          const ids = tagsRows.map(t => t.tagged_user_id);
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", ids);
          
          taggedUsers = (profs ?? []).map(p => {
            const tagRow = tagsRows.find(t => t.tagged_user_id === p.id);
            return { 
              id: p.id, 
              name: p.full_name ?? "User",
              can_edit: tagRow?.can_edit || false,
              status: tagRow?.status || 'invited'
            };
          });
        }

        return {
          ...r,
          user_name: creator?.full_name || "User",
          user_avatar: creator?.avatar_url,
          profile_type: r.profile_type || 'personal',
          business_name: r.business_name,
          business_logo: r.business_logo,
          media_files: processedMedia,
          tags: taggedUsers
        };
      }));

      const filteredPosts = filterPostsByRelationship(items);
      setPosts(filteredPosts);

      const postIds = filteredPosts.map(p => p.id);
      if (postIds.length > 0) {
        const { data: allComments } = await supabase
          .from("photo_comments")
          .select(`
            id, post_id, user_id, body, created_at,
            profiles!inner(full_name, avatar_url)
          `)
          .in("post_id", postIds)
          .order("created_at", { ascending: true });

        const commentsByPost: { [key: string]: Comment[] } = {};
        (allComments ?? []).forEach((c: any) => {
          if (!commentsByPost[c.post_id]) commentsByPost[c.post_id] = [];
          commentsByPost[c.post_id].push({
            id: c.id,
            post_id: c.post_id,
            user_id: c.user_id,
            user_name: c.profiles?.full_name ?? "Anonymous",
            user_avatar: c.profiles?.avatar_url,
            body: c.body,
            created_at: c.created_at
          });
        });
        setComments(commentsByPost);

        if (viewerUserId) {
          const { data: likes } = await supabase
            .from("photo_likes")
            .select("post_id")
            .eq("user_id", viewerUserId)
            .in("post_id", postIds);
          
          setLikedPosts(new Set(likes?.map(l => l.post_id) ?? []));
        }

        const { data: likeCounts } = await supabase
          .from("photo_likes")
          .select("post_id")
          .in("post_id", postIds);
        
        const counts: { [key: string]: number } = {};
        postIds.forEach(id => counts[id] = 0);
        likeCounts?.forEach(l => counts[l.post_id]++);
        setLikeCounts(counts);
      }
    } catch (err: any) {
      console.error("Error loading posts:", err);
      showMessage("error", "Failed to load posts");
    }
  }

  // FIXED: Create new post with multiple files
  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !userId || !canPost) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      let postId: string;
      let tableUsed: 'posts' | 'photo_posts' = 'photo_posts';

      // Create the post first
      if (profileType === 'business' && businessId) {
        const postData = {
          user_id: userId,
          business_id: businessId,
          profile_type: 'business' as const,
          caption: caption.trim() || null,
          description: description.trim() || null,
          visibility: visibility as any,
        };

        const { data: newPost, error } = await supabase
          .from("posts")
          .insert(postData)
          .select()
          .single();
        
        if (error) throw error;
        postId = newPost.id;
        tableUsed = 'posts';
      } else {
        const postData = {
          user_id: userId,
          caption: caption.trim() || null,
          description: description.trim() || null,
          visibility,
        };

        const { data: newPost, error } = await supabase
          .from("photo_posts")
          .insert(postData)
          .select()
          .single();
        
        if (error) throw error;
        postId = newPost.id;
      }

      // Upload ALL files - FIXED: Batch insert for efficiency
      const uploadedFiles: Array<{
        post_id: string;
        storage_path: string;
        type: 'image' | 'video';
        sort_order: number;
        created_by: string;
        uploaded_by: string;
      }> = [];

      for (let i = 0; i < files.length; i++) {
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
        
        const file = files[i];
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${timestamp}-${randomStr}-${cleanName}`;
        const path = profileType === 'business' && businessId 
          ? `business/${businessId}/${filename}`
          : `${userId}/${filename}`;

        const { error: uploadError } = await supabase.storage
          .from("event-photos")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error(`Failed to upload file ${i + 1}:`, uploadError);
          // Continue with other files even if one fails
          continue;
        }

        // Collect file data for batch insert
        uploadedFiles.push({
          post_id: postId,
          storage_path: path,
          type: file.type.startsWith('video') ? 'video' : 'image',
          sort_order: i,
          created_by: userId,
          uploaded_by: userId
        });
      }

      // Batch insert all media records at once
      if (uploadedFiles.length > 0) {
        const { error: mediaError } = await supabase
          .from("post_media")
          .insert(uploadedFiles);

        if (mediaError) {
          console.error("Failed to save media records:", mediaError);
          // Clean up the post if media insertion fails
          await supabase.from(tableUsed).delete().eq("id", postId);
          throw new Error("Failed to save media records");
        }
      }

      // Handle tags for personal posts
      if (profileType === 'personal' && tags.trim()) {
        const tagNames = tags.split(",").map(s => s.trim()).filter(Boolean);
        if (tagNames.length) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id")
            .in("full_name", tagNames);
          
          if (profiles?.length) {
            const tagRows = profiles.map(p => ({ 
              post_id: postId, 
              tagged_user_id: p.id,
              can_edit: true,
              status: 'invited'
            }));
            await supabase.from("photo_tags").insert(tagRows);

            const notifications = profiles.map(p => ({
              user_id: p.id,
              type: 'photo_tag',
              message: `You've been tagged in a photo post. Accept to add your own photos!`,
              post_id: postId
            }));
            await supabase.from("notifications").insert(notifications);
          }
        }
      }

      setCaption("");
      setDescription("");
      setTags("");
      setVisibility(profileType === 'business' ? 'public' : 'friends');
      setSelectedFiles(null);
      
      showMessage("success", `${uploadedFiles.length} photo(s) uploaded successfully! 🎉`);
      await listPosts();
    } catch (err: any) {
      console.error("Upload error:", err);
      showMessage("error", err.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = "";
    }
  }

  // FIXED: Co-creator adds photos to existing post
  async function addPhotosToPost(postId: string, files: FileList) {
    if (!files || files.length === 0 || !viewerUserId) return;

    setAddingToPost(postId);
    setUploadProgress(0);

    try {
      const { data: existingMedia } = await supabase
        .from("post_media")
        .select("id")
        .eq("post_id", postId);

      const startIndex = existingMedia?.length || 0;
      const uploadedFiles: Array<{
        post_id: string;
        storage_path: string;
        type: 'image' | 'video';
        sort_order: number;
        created_by: string;
        uploaded_by: string;
      }> = [];

      for (let i = 0; i < files.length; i++) {
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
        
        const file = files[i];
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${timestamp}-${randomStr}-${cleanName}`;
        const path = `${viewerUserId}/${filename}`;

        const { error: uploadError } = await supabase.storage
          .from("event-photos")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error(`Failed to upload file ${i + 1}:`, uploadError);
          continue;
        }

        uploadedFiles.push({
          post_id: postId,
          storage_path: path,
          type: file.type.startsWith('video') ? 'video' : 'image',
          sort_order: startIndex + i,
          created_by: viewerUserId,
          uploaded_by: viewerUserId
        });
      }

      // Batch insert all media records
      if (uploadedFiles.length > 0) {
        const { error: mediaError } = await supabase
          .from("post_media")
          .insert(uploadedFiles);

        if (mediaError) {
          console.error("Failed to save media records:", mediaError);
          throw new Error("Failed to save media records");
        }
      }

      showMessage("success", `Added ${uploadedFiles.length} photo(s)! 🎊`);
      await listPosts();
    } catch (err: any) {
      console.error("Add photos error:", err);
      showMessage("error", "Failed to add photos");
    } finally {
      setAddingToPost(null);
      setUploadProgress(0);
    }
  }

  // FIXED: Save edit function with proper multi-file handling
  async function saveEdit() {
    if (!editingPostId) return;

    setUploading(true);
    setUploadProgress(0);
    
    try {
      const post = posts.find(p => p.id === editingPostId);
      if (!post) {
        throw new Error("Post not found");
      }

      // Update post metadata
      const tableToUpdate = post.profile_type === 'business' ? 'posts' : 'photo_posts';
      
      const { error: updateError } = await supabase
        .from(tableToUpdate)
        .update({
          caption: editCaption.trim() || null,
          description: editDescription.trim() || null,
          visibility: editVisibility,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingPostId);
      
      if (updateError) {
        console.error(`Error updating ${tableToUpdate}:`, updateError);
        throw updateError;
      }

      // Upload new files if any
      if (editFiles && editFiles.length > 0 && viewerUserId) {
        console.log(`Processing ${editFiles.length} new files for upload`);
        
        // Get existing media count for sort order
        const { data: existingMedia } = await supabase
          .from("post_media")
          .select("id")
          .eq("post_id", editingPostId);

        const startIndex = existingMedia?.length || 0;
        const uploadedFiles: Array<{
          post_id: string;
          storage_path: string;
          type: 'image' | 'video';
          sort_order: number;
          created_by: string;
          uploaded_by: string;
        }> = [];

        // Upload all files first, collect successful uploads
        for (let i = 0; i < editFiles.length; i++) {
          setUploadProgress(Math.round(((i + 1) / editFiles.length) * 100));
          
          const file = editFiles[i];
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substring(7);
          const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filename = `${timestamp}-${randomStr}-${cleanName}`;
          const path = `${viewerUserId}/${filename}`;

          console.log(`Uploading file ${i + 1}/${editFiles.length}: ${filename}`);

          const { error: uploadError } = await supabase.storage
            .from("event-photos")
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            console.error(`Storage upload failed for file ${i + 1}:`, uploadError);
            continue; // Skip this file but continue with others
          }

          console.log(`File ${i + 1} uploaded successfully`);

          uploadedFiles.push({
            post_id: editingPostId,
            storage_path: path,
            type: file.type.startsWith('video') ? 'video' : 'image',
            sort_order: startIndex + i,
            created_by: viewerUserId,
            uploaded_by: viewerUserId
          });
        }

        // Batch insert all successful uploads
        if (uploadedFiles.length > 0) {
          console.log(`Inserting ${uploadedFiles.length} media records into database`);
          
          const { data: insertedMedia, error: mediaError } = await supabase
            .from("post_media")
            .insert(uploadedFiles)
            .select();

          if (mediaError) {
            console.error("Database insert failed:", mediaError);
            // Clean up uploaded files on database error
            const pathsToDelete = uploadedFiles.map(f => f.storage_path);
            await supabase.storage.from("event-photos").remove(pathsToDelete);
            throw new Error(`Database error: ${mediaError.message}`);
          }

          console.log(`Successfully inserted ${insertedMedia?.length} media records`);
        }
      }

      // Update tags for personal posts (only if post owner)
      if (post.profile_type !== 'business' && post.user_id === viewerUserId) {
        await supabase
          .from("photo_tags")
          .delete()
          .eq("post_id", editingPostId);
        
        const tagNames = editTags.split(",").map(s => s.trim()).filter(Boolean);
        if (tagNames.length) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id")
            .in("full_name", tagNames);
          
          if (profiles?.length) {
            const tagRows = profiles.map(p => ({ 
              post_id: editingPostId, 
              tagged_user_id: p.id,
              can_edit: true,
              status: 'invited'
            }));
            
            await supabase.from("photo_tags").insert(tagRows);
          }
        }
      }

      setEditingPostId(null);
      setEditFiles(null);
      setUploadProgress(0);
      showMessage("success", "Post updated successfully! ✨");
      await listPosts();
    } catch (err: any) {
      console.error("Edit error:", err);
      showMessage("error", `Failed to update: ${err.message || "Unknown error"}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function deletePost(postId: string) {
    if (!confirm("Delete this post? This cannot be undone.")) return;

    setDeletingPostId(postId);
    
    try {
      const post = posts.find(p => p.id === postId);
      
      if (post?.media_files && post.media_files.length > 0) {
        const paths = post.media_files.map(m => m.path);
        await supabase.storage.from("event-photos").remove(paths);
      }

      if (post?.profile_type === 'business') {
        const { error } = await supabase
          .from("posts")
          .delete()
          .eq("id", postId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("photo_posts")
          .delete()
          .eq("id", postId);
        if (error) throw error;
      }

      showMessage("success", "Post deleted");
      await listPosts();
    } catch (err: any) {
      console.error("Delete error:", err);
      showMessage("error", "Failed to delete");
    } finally {
      setDeletingPostId(null);
    }
  }

  async function removeMedia(postId: string, mediaId: string, mediaPath: string) {
    if (!confirm("Remove this photo/video?")) return;

    try {
      const post = posts.find(p => p.id === postId);
      if (post?.media_files.length === 1) {
        showMessage("error", "Cannot remove last media. Delete the post instead.");
        return;
      }

      await supabase.storage.from("event-photos").remove([mediaPath]);
      await supabase.from("post_media").delete().eq("id", mediaId);
      
      showMessage("success", "Media removed");
      await listPosts();
    } catch (err: any) {
      showMessage("error", "Failed to remove");
    }
  }

  async function toggleLike(postId: string) {
    if (!viewerUserId) {
      showMessage("error", "Sign in to like posts");
      return;
    }

    try {
      if (likedPosts.has(postId)) {
        await supabase
          .from("photo_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", viewerUserId);
        
        setLikedPosts(prev => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
        setLikeCounts(prev => ({ ...prev, [postId]: Math.max(0, prev[postId] - 1) }));
      } else {
        await supabase
          .from("photo_likes")
          .insert({ post_id: postId, user_id: viewerUserId });
        
        setLikedPosts(prev => new Set([...prev, postId]));
        setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
      }
    } catch (err: any) {
      showMessage("error", "Failed to like");
    }
  }

  async function startEdit(post: Post) {
    if (!canEditPost(post)) return;
    
    setEditingPostId(post.id);
    setEditCaption(post.caption || "");
    setEditDescription(post.description || "");
    setEditTags(post.tags.map(t => t.name).join(", "));
    setEditVisibility(post.visibility);
  }

  async function handleCommentSubmit(postId: string) {
    if (!viewerUserId || !commentText[postId]?.trim()) return;

    try {
      const { error } = await supabase.from("photo_comments").insert({
        post_id: postId,
        user_id: viewerUserId,
        body: commentText[postId].trim()
      });

      if (error) throw error;

      setCommentText({ ...commentText, [postId]: "" });
      showMessage("success", "Comment added! 💬");
      await listPosts();
    } catch (err: any) {
      showMessage("error", "Failed to comment");
    }
  }

  async function respondToCollabInvite(postId: string, accept: boolean) {
    if (!viewerUserId) return;

    try {
      if (accept) {
        await supabase
          .from("photo_tags")
          .update({ status: 'accepted' })
          .eq("post_id", postId)
          .eq("tagged_user_id", viewerUserId);
        showMessage("success", "You can now add photos!");
      } else {
        await supabase
          .from("photo_tags")
          .update({ status: 'declined' })
          .eq("post_id", postId)
          .eq("tagged_user_id", viewerUserId);
        showMessage("success", "Invite declined");
      }
      await listPosts();
    } catch (err: any) {
      showMessage("error", "Failed to respond");
    }
  }

  const renderPostMedia = (post: Post) => {
    const allMedia = post.media_files || [];
    if (allMedia.length === 0) return null;

    const isExpanded = expandedMedia.has(post.id);
    const displayMedia = isExpanded ? allMedia : allMedia.slice(0, 4);

    return (
      <>
        <div className={`media-grid ${allMedia.length === 1 ? 'single' : ''}`}>
          {displayMedia.map((media, idx) => (
            <div key={media.id} className="media-item">
              {media.type === 'video' ? (
                <video 
                  src={media.url} 
                  controls
                  className="post-media"
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img 
                  src={media.url} 
                  alt=""
                  className="post-media"
                  loading="lazy"
                  onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                />
              )}
              
              {!isExpanded && idx === 3 && allMedia.length > 4 && (
                <div className="more-overlay">
                  <span>+{allMedia.length - 4}</span>
                </div>
              )}
              
              {editingPostId === post.id && canEditPost(post) && allMedia.length > 1 && (
                <button
                  className="media-delete"
                  onClick={() => removeMedia(post.id, media.id, media.path)}
                  aria-label="Remove"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        
        {allMedia.length > 4 && (
          <button
            className="show-more-btn"
            onClick={() => {
              const newExpanded = new Set(expandedMedia);
              if (isExpanded) {
                newExpanded.delete(post.id);
              } else {
                newExpanded.add(post.id);
              }
              setExpandedMedia(newExpanded);
            }}
          >
            {isExpanded ? "Show less" : `Show all ${allMedia.length} items`}
          </button>
        )}
      </>
    );
  };

  useEffect(() => { 
    listPosts(); 
  }, [userId, viewerUserId, relationshipType, profileType, businessId]);

  const visibilityOptions = profileType === 'business' ? BUSINESS_VISIBILITY_OPTIONS : VISIBILITY_OPTIONS;

  const hasPendingInvite = (post: Post) => {
    const tag = post.tags.find(t => t.id === viewerUserId);
    return tag && tag.status === 'invited';
  };

  const isAcceptedCollaborator = (post: Post) => {
    const tag = post.tags.find(t => t.id === viewerUserId);
    return tag && tag.status === 'accepted' && tag.can_edit;
  };

  return (
    <section className="photos-feed">
      {!isPublicView && (
        <>
          <h2 className="feed-title">
            {profileType === 'business' ? 'Business Posts' : 'Photos & Memories'}
          </h2>

          {message && (
            <div className={`message-toast ${message.type}`}>
              {message.text}
            </div>
          )}

          {canPost && (
            <div className="upload-card">
              <div className="upload-form">
                <div className="form-group">
                  <label className="form-label">Caption</label>
                  <input 
                    className="form-input" 
                    value={caption} 
                    onChange={(e) => setCaption(e.target.value.slice(0, 100))} 
                    placeholder={profileType === 'business' ? "What's new..." : "Share this moment..."} 
                    maxLength={100}
                  />
                  <span className="char-count">{caption.length}/100</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea 
                    className="form-textarea" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value.slice(0, 500))} 
                    placeholder={profileType === 'business' ? "Details..." : "Tell the story..."}
                    rows={2}
                    maxLength={500}
                  />
                  <span className="char-count">{description.length}/500</span>
                </div>

                {profileType === 'personal' && (
                  <div className="form-group">
                    <label className="form-label">Tag Friends (they can add photos too!)</label>
                    <input 
                      className="form-input" 
                      value={tags} 
                      onChange={(e) => setTags(e.target.value)} 
                      placeholder="Names separated by commas" 
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Visibility</label>
                  <select 
                    className="form-select" 
                    value={visibility} 
                    onChange={(e) => setVisibility(e.target.value as any)}
                  >
                    {visibilityOptions.map(v => (
                      <option key={v.value} value={v.value}>
                        {v.icon} {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedFiles && selectedFiles.length > 0 && (
                  <div className="selected-files">
                    <span className="files-count">
                      {selectedFiles.length} file(s) selected 🎉
                    </span>
                  </div>
                )}

                <label className="upload-button">
                  <input 
                    type="file" 
                    accept="image/*,video/*" 
                    multiple
                    className="file-input" 
                    onChange={(e) => {
                      setSelectedFiles(e.target.files);
                      onUpload(e);
                    }}
                    disabled={uploading}
                  />
                  {uploading ? `Uploading... ${uploadProgress}%` : "📸 Upload Photos/Videos"}
                </label>

                {uploading && uploadProgress > 0 && (
                  <div className="upload-progress">
                    <div 
                      className="upload-progress-bar" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <div className="posts-grid">
        {posts.map(post => {
          const isInvited = hasPendingInvite(post);
          const isCollaborator = isAcceptedCollaborator(post);

          return (
            <div key={post.id} className="post-card">
              {isInvited && (
                <div className="collab-invite">
                  <p>You've been tagged! Add your photos to this post.</p>
                  <div className="invite-actions">
                    <button 
                      className="invite-accept"
                      onClick={() => respondToCollabInvite(post.id, true)}
                    >
                      ✓ Accept
                    </button>
                    <button 
                      className="invite-decline"
                      onClick={() => respondToCollabInvite(post.id, false)}
                    >
                      × Decline
                    </button>
                  </div>
                </div>
              )}

              {isCollaborator && !editingPostId && (
                <div className="collab-add-section">
                  <label className="collab-add-btn">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="file-input"
                      onChange={async (e) => {
                        if (e.target.files) {
                          await addPhotosToPost(post.id, e.target.files);
                          e.target.value = "";
                        }
                      }}
                      disabled={addingToPost === post.id}
                    />
                    {addingToPost === post.id ? `Uploading... ${uploadProgress}%` : "➕ Add Your Photos"}
                  </label>
                </div>
              )}

              <div className="post-image-container">
                {renderPostMedia(post)}
                
                <button
                  className={`like-button ${likedPosts.has(post.id) ? 'liked' : ''}`}
                  onClick={() => toggleLike(post.id)}
                  aria-label={likedPosts.has(post.id) ? 'Unlike' : 'Like'}
                >
                  {likedPosts.has(post.id) ? '❤️' : '🤍'}
                </button>
              </div>
              
              <div className="post-content">
                {editingPostId === post.id ? (
                  <div className="edit-mode">
                    <input
                      className="edit-input"
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value.slice(0, 100))}
                      placeholder="Caption"
                    />
                    <textarea
                      className="edit-textarea"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value.slice(0, 500))}
                      placeholder="Description"
                      rows={2}
                    />
                    {post.profile_type !== 'business' && post.user_id === viewerUserId && (
                      <input
                        className="edit-input"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        placeholder="Tags"
                      />
                    )}
                    <select
                      className="edit-select"
                      value={editVisibility}
                      onChange={(e) => setEditVisibility(e.target.value as any)}
                    >
                      {(post.profile_type === 'business' ? BUSINESS_VISIBILITY_OPTIONS : VISIBILITY_OPTIONS).map(v => (
                        <option key={v.value} value={v.value}>
                          {v.icon} {v.label}
                        </option>
                      ))}
                    </select>
                    
                    <label className="add-media-btn">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="file-input"
                        onChange={(e) => setEditFiles(e.target.files)}
                        disabled={uploading}
                      />
                      {uploading && editFiles ? 
                        `Uploading... ${uploadProgress}%` : 
                        "+ Add More Photos/Videos"
                      }
                    </label>
                    {editFiles && editFiles.length > 0 && !uploading && (
                      <span className="edit-files-count">
                        {editFiles.length} new file(s) selected
                      </span>
                    )}
                    
                    <div className="edit-actions">
                      <button
                        onClick={saveEdit}
                        className="btn-save"
                        disabled={uploading}
                      >
                        {uploading ? `Saving... ${uploadProgress}%` : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingPostId(null);
                          setEditFiles(null);
                          setUploadProgress(0);
                        }}
                        className="btn-cancel"
                        disabled={uploading}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="post-creator">
                      {post.profile_type === 'business' ? (
                        <>
                          {post.business_logo && (
                            <img 
                              src={post.business_logo} 
                              alt={post.business_name}
                              className="creator-avatar business-logo"
                            />
                          )}
                          <Link href={`/business/${post.business_id}`} className="creator-link business-link">
                            <span className="creator-name">{post.business_name || 'Business'}</span>
                          </Link>
                          <span className="business-badge">Business</span>
                        </>
                      ) : (
                        <>
                          <Link href={`/profile/${post.user_id}`} className="creator-link">
                            {post.user_avatar && (
                              <img 
                                src={post.user_avatar} 
                                alt={post.user_name}
                                className="creator-avatar"
                              />
                            )}
                            <span className="creator-name">{post.user_name}</span>
                          </Link>
                        </>
                      )}
                      
                      {post.tags.filter(t => t.can_edit && t.status === 'accepted').length > 0 && (
                        <>
                          <span className="with-text">with</span>
                          {post.tags.filter(t => t.can_edit && t.status === 'accepted').map((tag, idx, arr) => (
                            <span key={tag.id}>
                              <Link href={`/profile/${tag.id}`} className="creator-link">
                                {tag.name}
                              </Link>
                              {idx < arr.length - 1 && ", "}
                            </span>
                          ))}
                        </>
                      )}
                    </div>

                    {post.caption && (
                      <h3 className="post-caption">{post.caption}</h3>
                    )}
                    
                    {(expandedPost === post.id || !post.description || post.description.length < 100) && post.description && (
                      <p className="post-description">{post.description}</p>
                    )}
                    
                    {post.description && post.description.length >= 100 && expandedPost !== post.id && (
                      <button 
                        className="read-more"
                        onClick={() => setExpandedPost(post.id)}
                      >
                        Read more...
                      </button>
                    )}

                    <div className="post-meta">
                      <div className="meta-left">
                        <span className="visibility-badge">
                          {visibilityOptions.find(v => v.value === post.visibility)?.icon}
                        </span>
                        <span className="like-count">
                          {likeCounts[post.id] || 0} likes
                        </span>
                      </div>
                      <span className="post-date">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="post-actions">
                      {canEditPost(post) && post.user_id === viewerUserId && (
                        <button
                          onClick={() => startEdit(post)}
                          className="btn-edit"
                        >
                          Edit
                        </button>
                      )}
                      {canDeletePost(post) && (
                        <button
                          onClick={() => deletePost(post.id)}
                          className="btn-delete"
                          disabled={deletingPostId === post.id}
                        >
                          {deletingPostId === post.id ? "..." : "Delete"}
                        </button>
                      )}
                    </div>

                    <div className="comments-section">
                      <h4 className="comments-title">Comments</h4>
                      
                      <div className="comments-list">
                        {comments[post.id]?.map(comment => (
                          <div key={comment.id} className="comment">
                            <Link 
                              href={`/profile/${comment.user_id}`}
                              className="comment-author"
                            >
                              {comment.user_avatar && (
                                <img 
                                  src={comment.user_avatar} 
                                  alt={comment.user_name}
                                  className="comment-avatar"
                                />
                              )}
                              {comment.user_name}
                            </Link>
                            <span className="comment-body">{comment.body}</span>
                          </div>
                        ))}
                      </div>

                      {viewerUserId && (
                        <div className="comment-form">
                          <input
                            className="comment-input"
                            placeholder="Add a comment..."
                            value={commentText[post.id] || ""}
                            onChange={(e) => setCommentText({
                              ...commentText,
                              [post.id]: e.target.value
                            })}
                            onKeyPress={(e) => {
                              if (e.key === "Enter") handleCommentSubmit(post.id);
                            }}
                          />
                          <button
                            onClick={() => handleCommentSubmit(post.id)}
                            className="comment-submit"
                            disabled={!commentText[post.id]?.trim()}
                          >
                            Post
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!posts.length && (
        <div className="empty-state">
          {isPublicView && relationshipType === 'none' ? (
            <>
              <p className="empty-title">No public photos</p>
              <p className="empty-subtitle">
                {profileType === 'business' ? 'Follow this business' : 'Connect as friends to see more'}
              </p>
            </>
          ) : (
            <>
              <p className="empty-title">No photos yet</p>
              <p className="empty-subtitle">
                {canPost ? 
                  (profileType === 'business' ? "Share your business updates!" : "Share your first memory!") 
                  : "Check back later"}
              </p>
            </>
          )}
        </div>
      )}

      <style jsx>{`
        .photos-feed {
          position: relative;
        }

        .feed-title {
          font-size: clamp(1.5rem, 4vw, 2rem);
          font-weight: 700;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .message-toast {
          position: fixed;
          top: 5rem;
          right: 1rem;
          left: 1rem;
          z-index: 50;
          padding: 1rem;
          border-radius: 0.5rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideIn 0.3s ease;
          color: white;
          font-weight: 500;
          max-width: 500px;
          margin: 0 auto;
        }

        @media (min-width: 640px) {
          .message-toast {
            left: auto;
          }
        }

        .message-toast.success {
          background: #10b981;
        }

        .message-toast.error {
          background: #ef4444;
        }

        @keyframes slideIn {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .upload-card {
          background: white;
          border-radius: 1rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          border: 1px solid #e5e7eb;
          padding: clamp(1rem, 2vw, 1.5rem);
          margin-bottom: 2rem;
        }

        .upload-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-group {
          position: relative;
        }

        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.25rem;
          color: #374151;
        }

        .form-input, .form-textarea, .form-select {
          width: 100%;
          padding: 0.625rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 16px;
          transition: all 0.2s;
          -webkit-appearance: none;
        }

        .form-input:focus, .form-textarea:focus, .form-select:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }

        .form-textarea {
          resize: vertical;
          min-height: 4rem;
          font-family: inherit;
        }

        .char-count {
          position: absolute;
          right: 0.5rem;
          bottom: -1.25rem;
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .selected-files {
          padding: 0.5rem;
          background: #f3f4f6;
          border-radius: 0.375rem;
        }

        .files-count {
          font-size: 0.875rem;
          color: #10b981;
          font-weight: 500;
        }

        .upload-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          color: white;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          -webkit-tap-highlight-color: transparent;
          min-height: 44px;
        }

        .upload-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139,92,246,0.3);
        }

        .upload-button:active {
          transform: translateY(0);
        }

        .upload-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .file-input {
          display: none;
        }

        .upload-progress {
          height: 4px;
          background: #e5e7eb;
          border-radius: 2px;
          overflow: hidden;
        }

        .upload-progress-bar {
          height: 100%;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          transition: width 0.3s ease;
        }

        .posts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
          gap: clamp(1rem, 2vw, 1.5rem);
        }

        .post-card {
          background: white;
          border-radius: 1rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          overflow: hidden;
          transition: all 0.2s;
        }

        .post-card:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          transform: translateY(-2px);
        }

        @media (hover: none) {
          .post-card:hover {
            transform: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          }
        }

        .collab-invite {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          padding: 1rem;
          border-bottom: 2px solid #f59e0b;
        }

        .collab-invite p {
          margin: 0 0 0.5rem 0;
          color: #92400e;
          font-weight: 500;
          font-size: 0.875rem;
        }

        .invite-actions {
          display: flex;
          gap: 0.5rem;
        }

        .invite-accept, .invite-decline {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 36px;
        }

        .invite-accept {
          background: #10b981;
          color: white;
        }

        .invite-decline {
          background: #ef4444;
          color: white;
        }

        .collab-add-section {
          background: #f0fdf4;
          padding: 0.75rem;
          border-bottom: 1px solid #86efac;
        }

        .collab-add-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 0.5rem;
          background: #10b981;
          color: white;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 40px;
        }

        .collab-add-btn:hover:not(:disabled) {
          background: #059669;
        }

        .collab-add-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .post-image-container {
          position: relative;
          background: #f3f4f6;
        }

        .media-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2px;
        }

        .media-grid.single {
          grid-template-columns: 1fr;
        }

        .media-item {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
        }

        .post-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .post-media:hover {
          transform: scale(1.05);
        }

        @media (hover: none) {
          .post-media:hover {
            transform: none;
          }
        }

        .more-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.7);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: bold;
        }

        .media-delete {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          width: 2rem;
          height: 2rem;
          background: rgba(239,68,68,0.9);
          color: white;
          border: none;
          border-radius: 50%;
          font-size: 1.25rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .show-more-btn {
          width: 100%;
          padding: 0.5rem;
          background: #f3f4f6;
          border: none;
          font-size: 0.875rem;
          color: #6b7280;
          cursor: pointer;
          transition: background 0.2s;
        }

        .show-more-btn:hover {
          background: #e5e7eb;
        }

        .like-button {
          position: absolute;
          bottom: 0.75rem;
          right: 0.75rem;
          width: clamp(2.5rem, 5vw, 3rem);
          height: clamp(2.5rem, 5vw, 3rem);
          background: rgba(255,255,255,0.9);
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: clamp(1.25rem, 3vw, 1.5rem);
          transition: all 0.2s;
          backdrop-filter: blur(10px);
          -webkit-tap-highlight-color: transparent;
        }

        .like-button:active {
          transform: scale(0.9);
        }

        .like-button.liked {
          background: rgba(239,68,68,0.1);
        }

        .post-content {
          padding: clamp(0.75rem, 2vw, 1rem);
        }

        .post-creator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
        }

        .creator-link {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          color: #8b5cf6;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .creator-avatar {
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          object-fit: cover;
        }

        .business-logo {
          border-radius: 0.25rem;
        }

        .business-badge {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          color: white;
          font-size: 0.625rem;
          padding: 0.125rem 0.5rem;
          border-radius: 0.25rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .with-text {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .post-caption {
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
          word-wrap: break-word;
        }

        .post-description {
          color: #6b7280;
          font-size: 0.875rem;
          line-height: 1.5;
          margin-bottom: 0.75rem;
          word-wrap: break-word;
        }

        .read-more {
          color: #8b5cf6;
          background: none;
          border: none;
          font-size: 0.875rem;
          cursor: pointer;
          padding: 0;
          margin-bottom: 0.75rem;
        }

        .post-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0.5rem;
          border-top: 1px solid #f3f4f6;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .meta-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .visibility-badge {
          font-size: 0.875rem;
        }

        .like-count {
          font-weight: 500;
        }

        .post-date {
          color: #9ca3af;
        }

        .post-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .btn-edit, .btn-delete {
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          border: none;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          -webkit-tap-highlight-color: transparent;
          min-height: 36px;
        }

        .btn-edit {
          background: #3b82f6;
          color: white;
        }

        .btn-edit:hover {
          background: #2563eb;
        }

        .btn-delete {
          background: #ef4444;
          color: white;
        }

        .btn-delete:hover {
          background: #dc2626;
        }

        .btn-delete:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .edit-mode {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .edit-input, .edit-textarea, .edit-select {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 16px;
          -webkit-appearance: none;
        }

        .edit-textarea {
          resize: vertical;
          min-height: 3rem;
          font-family: inherit;
        }

        .add-media-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          background: #f3f4f6;
          border: 2px dashed #d1d5db;
          border-radius: 0.375rem;
          color: #6b7280;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 40px;
        }

        .add-media-btn:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }

        .edit-files-count {
          font-size: 0.75rem;
          color: #10b981;
        }

        .edit-actions {
          display: flex;
          gap: 0.5rem;
        }

        .btn-save, .btn-cancel {
          flex: 1;
          padding: 0.5rem;
          border-radius: 0.375rem;
          border: none;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          -webkit-tap-highlight-color: transparent;
          min-height: 36px;
        }

        .btn-save {
          background: #10b981;
          color: white;
        }

        .btn-save:hover:not(:disabled) {
          background: #059669;
        }

        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-cancel {
          background: #6b7280;
          color: white;
        }

        .btn-cancel:hover {
          background: #4b5563;
        }

        .comments-section {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #f3f4f6;
        }

        .comments-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 0.75rem 0;
        }

        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          max-height: 200px;
          overflow-y: auto;
        }

        .comment {
          font-size: 0.875rem;
          line-height: 1.5;
          word-wrap: break-word;
        }

        .comment-author {
          font-weight: 600;
          color: #8b5cf6;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          margin-right: 0.25rem;
        }

        .comment-avatar {
          width: 1.25rem;
          height: 1.25rem;
          border-radius: 50%;
          object-fit: cover;
        }

        .comment-body {
          color: #4b5563;
        }

        .comment-form {
          display: flex;
          gap: 0.5rem;
        }

        .comment-input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 16px;
          -webkit-appearance: none;
        }

        .comment-input:focus {
          outline: none;
          border-color: #8b5cf6;
        }

        .comment-submit {
          padding: 0.5rem 1rem;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          -webkit-tap-highlight-color: transparent;
          min-height: 36px;
        }

        .comment-submit:hover:not(:disabled) {
          background: #7c3aed;
        }

        .comment-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #6b7280;
        }

        .empty-title {
          font-size: 1.125rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }

        .empty-subtitle {
          font-size: 0.875rem;
          color: #9ca3af;
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .posts-grid {
            padding: 0;
          }

          .post-card {
            border-radius: 0.75rem;
          }

          .comment-form {
            position: sticky;
            bottom: 0;
            background: white;
            padding: 0.5rem;
            border-top: 1px solid #e5e7eb;
            margin: 0 -0.75rem -0.75rem;
            z-index: 10;
          }

          .post-actions {
            position: sticky;
            bottom: 0;
            background: white;
            padding: 0.5rem;
            margin: 0 -0.75rem;
            border-top: 1px solid #e5e7eb;
          }

          /* Ensure all interactive elements are touch-friendly */
          button, .upload-button, input, textarea, select {
            min-height: 44px;
            font-size: 16px;
          }

          .btn-edit, .btn-delete, .btn-save, .btn-cancel {
            min-height: 40px;
            padding: 0.625rem 1rem;
          }
        }

        /* Accessibility improvements */
        button:focus-visible,
        .upload-button:focus-visible,
        input:focus-visible,
        textarea:focus-visible,
        select:focus-visible,
        a:focus-visible {
          outline: 2px solid #8b5cf6;
          outline-offset: 2px;
        }

        /* Scrollbar styling */
        .comments-list::-webkit-scrollbar {
          width: 4px;
        }

        .comments-list::-webkit-scrollbar-track {
          background: #f3f4f6;
        }

        .comments-list::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 2px;
        }

        .comments-list::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        /* Performance optimizations */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* Dark mode support ready (if you add it later) */
        @media (prefers-color-scheme: dark) {
          /* Add dark mode styles here when needed */
        }
      `}</style>
    </section>
  );
}
