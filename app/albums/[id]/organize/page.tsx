// app/albums/[id]/organize/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type MediaItem = {
  id: string;
  album_id: string;
  user_id: string;
  media_url: string;
  media_type: 'photo' | 'video';
  group_label: string | null;
  sort_order: number;
  is_used: boolean;
  created_at: string;
};

export default function PhotoOrganizerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [albumTitle, setAlbumTitle] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  
  // Media and groups
  const [allMedia, setAllMedia] = useState<MediaItem[]>([]);
  const [groups, setGroups] = useState<string[]>(['Unsorted']);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  
  // Drag state
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (userId) {
      loadAlbumAndMedia();
    }
  }, [userId]);

  async function loadAlbumAndMedia() {
    try {
      setLoading(true);

      // Check permissions
      const { data: albumData } = await supabase
        .from('albums')
        .select('title, creator_id')
        .eq('id', params.id)
        .single();

      if (!albumData) {
        alert('Album not found');
        router.push('/albums');
        return;
      }

      setAlbumTitle(albumData.title);

      const isCreator = albumData.creator_id === userId;
      let hasEditPermission = isCreator;

      if (!isCreator) {
        const { data: collabData } = await supabase
          .from('album_collaborators')
          .select('can_edit, status')
          .eq('album_id', params.id)
          .eq('user_id', userId)
          .single();

        if (collabData?.status === 'accepted' && collabData.can_edit) {
          hasEditPermission = true;
        }
      }

      setCanEdit(hasEditPermission);

      if (!hasEditPermission) {
        alert('You do not have permission to organize photos for this album');
        router.push(`/albums/${params.id}`);
        return;
      }

      // Load media
      const { data: mediaData } = await supabase
        .from('album_media')
        .select('*')
        .eq('album_id', params.id)
        .order('sort_order', { ascending: true });

      if (mediaData) {
        setAllMedia(mediaData);

        // Extract unique groups
        const uniqueGroups = new Set<string>(['Unsorted']);
        mediaData.forEach(item => {
          if (item.group_label) {
            uniqueGroups.add(item.group_label);
          }
        });
        setGroups(Array.from(uniqueGroups));
      }

    } catch (error) {
      console.error('Error loading:', error);
    } finally {
      setLoading(false);
    }
  }

  // Upload photos
  async function handlePhotoUpload(files: FileList) {
    if (!userId || files.length === 0) return;
    
    setUploading(true);

    try {
      const newMediaItems: any[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/album-${params.id}-${Date.now()}-${i}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('post-media')
          .upload(fileName, file);

        if (!error && data) {
          const { data: { publicUrl } } = supabase.storage
            .from('post-media')
            .getPublicUrl(fileName);

          newMediaItems.push({
            album_id: params.id,
            user_id: userId,
            media_url: publicUrl,
            media_type: file.type.startsWith('video') ? 'video' : 'photo',
            group_label: null,
            sort_order: allMedia.length + i,
            is_used: false
          });
        }
      }

      if (newMediaItems.length > 0) {
        const { data, error } = await supabase
          .from('album_media')
          .insert(newMediaItems)
          .select();

        if (!error && data) {
          setAllMedia([...allMedia, ...data]);
          alert(`${newMediaItems.length} photo(s) uploaded successfully!`);
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload photos. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  // Create new group
  async function createGroup() {
    const trimmed = newGroupName.trim();
    if (!trimmed || groups.includes(trimmed)) {
      alert('Group name already exists or is empty');
      return;
    }

    setGroups([...groups, trimmed]);
    setNewGroupName('');
    setShowNewGroupInput(false);
  }

  // Delete group (moves photos to Unsorted)
  async function deleteGroup(groupName: string) {
    if (groupName === 'Unsorted') return;
    
    if (!confirm(`Delete "${groupName}" group? Photos will be moved to Unsorted.`)) return;

    try {
      // Move all photos in this group to Unsorted
      const itemsInGroup = allMedia.filter(m => m.group_label === groupName);
      
      for (const item of itemsInGroup) {
        await supabase
          .from('album_media')
          .update({ group_label: null })
          .eq('id', item.id);
      }

      // Update local state
      setAllMedia(allMedia.map(m => 
        m.group_label === groupName ? { ...m, group_label: null } : m
      ));
      setGroups(groups.filter(g => g !== groupName));
      
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Failed to delete group');
    }
  }

  // Drag handlers
  function handleDragStart(itemId: string) {
    setDraggedItem(itemId);
  }

  function handleDragOver(e: React.DragEvent, groupName: string) {
    e.preventDefault();
    setDragOverGroup(groupName);
  }

  async function handleDrop(e: React.DragEvent, targetGroup: string) {
    e.preventDefault();
    setDragOverGroup(null);

    if (!draggedItem) return;

    const groupLabel = targetGroup === 'Unsorted' ? null : targetGroup;

    try {
      // Update in database
      const { error } = await supabase
        .from('album_media')
        .update({ group_label: groupLabel })
        .eq('id', draggedItem);

      if (!error) {
        // Update local state
        setAllMedia(allMedia.map(m => 
          m.id === draggedItem ? { ...m, group_label: groupLabel } : m
        ));
      }
    } catch (error) {
      console.error('Error moving photo:', error);
    }

    setDraggedItem(null);
  }

  // Delete media
  async function deleteMedia(itemId: string) {
    if (!confirm('Delete this photo? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('album_media')
        .delete()
        .eq('id', itemId);

      if (!error) {
        setAllMedia(allMedia.filter(m => m.id !== itemId));
      }
    } catch (error) {
      console.error('Error deleting media:', error);
      alert('Failed to delete photo');
    }
  }

  // Get media for a group
  function getMediaForGroup(groupName: string) {
    if (groupName === 'Unsorted') {
      return allMedia.filter(m => !m.group_label);
    }
    return allMedia.filter(m => m.group_label === groupName);
  }

  // Filter by selected group
  const displayedMedia = selectedGroup 
    ? getMediaForGroup(selectedGroup)
    : allMedia;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p>Loading photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                📦 Photo Organizer
              </h1>
              <p className="text-gray-600 mt-1">{albumTitle}</p>
            </div>
            <div className="flex gap-2">
              <label className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg cursor-pointer hover:opacity-90">
                {uploading ? '⏳ Uploading...' : '📷 Upload Photos'}
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              <button
                onClick={() => router.push(`/albums/${params.id}/edit`)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Back to Editing
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-sm text-gray-600">
            <span>📸 {allMedia.length} total photos</span>
            <span>📁 {groups.length} groups</span>
            <span>✅ {allMedia.filter(m => m.is_used).length} used in album</span>
          </div>
        </div>

        {/* Groups Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">📁 Photo Groups</h2>
            <button
              onClick={() => setShowNewGroupInput(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              ➕ New Group
            </button>
          </div>

          {/* New Group Input */}
          {showNewGroupInput && (
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name (e.g., Dinner Photos)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                onKeyPress={(e) => e.key === 'Enter' && createGroup()}
              />
              <button
                onClick={createGroup}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowNewGroupInput(false);
                  setNewGroupName('');
                }}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Group Chips with Drag & Drop */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedGroup(null)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedGroup === null
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              🌐 All Photos ({allMedia.length})
            </button>
            
            {groups.map(group => {
              const count = getMediaForGroup(group).length;
              return (
                <div
                  key={group}
                  className={`relative group ${
                    dragOverGroup === group ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onDragOver={(e) => handleDragOver(e, group)}
                  onDrop={(e) => handleDrop(e, group)}
                >
                  <button
                    onClick={() => setSelectedGroup(group)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedGroup === group
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    📁 {group} ({count})
                  </button>
                  {group !== 'Unsorted' && (
                    <button
                      onClick={() => deleteGroup(group)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-sm text-gray-500 mt-3">
            💡 Tip: Drag photos onto group names to organize them!
          </p>
        </div>

        {/* Photos Grid */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">
            {selectedGroup ? `📁 ${selectedGroup}` : '🌐 All Photos'}
          </h2>

          {displayedMedia.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">📸</p>
              <p>No photos in this group</p>
              <p className="text-sm mt-2">Upload photos or drag them from other groups</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {displayedMedia.map(item => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(item.id)}
                  className={`relative group cursor-move bg-gray-100 rounded-lg overflow-hidden aspect-square ${
                    draggedItem === item.id ? 'opacity-50' : ''
                  }`}
                >
                  {item.media_type === 'photo' ? (
                    <img
                      src={item.media_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={item.media_url}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => deleteMedia(item.id)}
                      className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm"
                    >
                      🗑️ Delete
                    </button>
                  </div>

                  {/* Badges */}
                  {item.is_used && (
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                        ✓ Used
                      </span>
                    </div>
                  )}
                  
                  {item.group_label && (
                    <div className="absolute bottom-2 left-2">
                      <span className="px-2 py-1 bg-purple-500 text-white text-xs rounded-full">
                        {item.group_label}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .loading-spinner {
          width: 2rem;
          height: 2rem;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
