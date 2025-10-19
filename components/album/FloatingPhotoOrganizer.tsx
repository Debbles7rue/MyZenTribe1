// components/album/FloatingPhotoOrganizer.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
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
};

type Props = {
  albumId: string;
  isOpen: boolean;
  onClose: () => void;
  onPhotoSelect?: (photoUrl: string, mediaType: 'photo' | 'video') => void;
};

export default function FloatingPhotoOrganizer({ albumId, isOpen, onClose, onPhotoSelect }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [allMedia, setAllMedia] = useState<MediaItem[]>([]);
  const [groups, setGroups] = useState<string[]>(['Unsorted']);
  const [selectedGroup, setSelectedGroup] = useState<string>('Unsorted');
  const [isMinimized, setIsMinimized] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);

  // Dragging state for the panel
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (userId && isOpen) {
      loadMedia();
    }
  }, [userId, isOpen, albumId]);

  async function loadMedia() {
    try {
      const { data: mediaData } = await supabase
        .from('album_media')
        .select('*')
        .eq('album_id', albumId)
        .order('sort_order', { ascending: true });

      if (mediaData) {
        setAllMedia(mediaData);

        const uniqueGroups = new Set<string>(['Unsorted']);
        mediaData.forEach(item => {
          if (item.group_label) {
            uniqueGroups.add(item.group_label);
          }
        });
        setGroups(Array.from(uniqueGroups));
      }
    } catch (error) {
      console.error('Error loading media:', error);
    }
  }

  async function handlePhotoUpload(files: FileList) {
    if (!userId || files.length === 0) return;
    
    setUploading(true);

    try {
      const newMediaItems: any[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/album-${albumId}-${Date.now()}-${i}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('post-media')
          .upload(fileName, file);

        if (!error && data) {
          const { data: { publicUrl } } = supabase.storage
            .from('post-media')
            .getPublicUrl(fileName);

          newMediaItems.push({
            album_id: albumId,
            user_id: userId,
            media_url: publicUrl,
            media_type: file.type.startsWith('video') ? 'video' : 'photo',
            group_label: selectedGroup === 'Unsorted' ? null : selectedGroup,
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
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  }

  async function createGroup() {
    const trimmed = newGroupName.trim();
    if (!trimmed || groups.includes(trimmed)) return;

    setGroups([...groups, trimmed]);
    setNewGroupName('');
    setShowNewGroupInput(false);
  }

  async function moveToGroup(itemId: string, targetGroup: string) {
    const groupLabel = targetGroup === 'Unsorted' ? null : targetGroup;

    try {
      await supabase
        .from('album_media')
        .update({ group_label: groupLabel })
        .eq('id', itemId);

      setAllMedia(allMedia.map(m => 
        m.id === itemId ? { ...m, group_label: groupLabel } : m
      ));
    } catch (error) {
      console.error('Error moving photo:', error);
    }
  }

  function getMediaForGroup(groupName: string) {
    if (groupName === 'Unsorted') {
      return allMedia.filter(m => !m.group_label);
    }
    return allMedia.filter(m => m.group_label === groupName);
  }

  // Panel dragging
  function handleMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('.no-drag')) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging) return;
      
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }

    function handleMouseUp() {
      setIsDragging(false);
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  if (!isOpen) return null;

  const displayedMedia = getMediaForGroup(selectedGroup);

  return (
    <div
      ref={panelRef}
      className="fixed bg-white rounded-xl shadow-2xl border-2 border-purple-500 z-50 floating-organizer"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? '300px' : '500px',
        maxHeight: isMinimized ? '60px' : '600px',
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Header - Draggable */}
      <div
        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-t-xl cursor-grab active:cursor-grabbing flex items-center justify-between"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📦</span>
          <span className="font-semibold">Photo Organizer</span>
          <span className="text-xs opacity-75">({allMedia.length} photos)</span>
        </div>
        
        <div className="flex gap-2 no-drag">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="w-6 h-6 bg-white/20 rounded hover:bg-white/30 flex items-center justify-center"
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? '□' : '_'}
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 bg-white/20 rounded hover:bg-white/30 flex items-center justify-center"
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Content - Only show when not minimized */}
      {!isMinimized && (
        <div className="p-4 overflow-y-auto no-drag" style={{ maxHeight: '540px' }}>
          {/* Upload Button */}
          <label className="block w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg cursor-pointer hover:opacity-90 text-center mb-3">
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

          {/* Groups */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold">Groups:</span>
              <button
                onClick={() => setShowNewGroupInput(true)}
                className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                + New
              </button>
            </div>

            {showNewGroupInput && (
              <div className="flex gap-1 mb-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name"
                  className="flex-1 px-2 py-1 border rounded text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && createGroup()}
                />
                <button
                  onClick={createGroup}
                  className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                >
                  ✓
                </button>
                <button
                  onClick={() => {
                    setShowNewGroupInput(false);
                    setNewGroupName('');
                  }}
                  className="px-2 py-1 bg-gray-300 rounded text-xs"
                >
                  ×
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-1">
              {groups.map(group => {
                const count = getMediaForGroup(group).length;
                return (
                  <button
                    key={group}
                    onClick={() => setSelectedGroup(group)}
                    className={`px-2 py-1 rounded text-xs ${
                      selectedGroup === group
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {group} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photos Grid */}
          <div className="border-t pt-3">
            <p className="text-xs text-gray-600 mb-2">
              💡 Drag photos onto your album pages!
            </p>
            
            {displayedMedia.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <p className="text-2xl mb-1">📸</p>
                <p>No photos in {selectedGroup}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {displayedMedia.map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('photo-url', item.media_url);
                      e.dataTransfer.setData('media-type', item.media_type);
                    }}
                    className="relative group cursor-move bg-gray-100 rounded overflow-hidden aspect-square hover:ring-2 hover:ring-purple-500"
                    onClick={() => onPhotoSelect && onPhotoSelect(item.media_url, item.media_type)}
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
                    
                    {item.is_used && (
                      <div className="absolute top-1 right-1">
                        <span className="px-1 py-0.5 bg-green-500 text-white text-xs rounded">
                          ✓
                        </span>
                      </div>
                    )}

                    {/* Move to Group on right-click */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity">
                      <select
                        onChange={(e) => moveToGroup(item.id, e.target.value)}
                        value={item.group_label || 'Unsorted'}
                        className="absolute bottom-1 left-1 right-1 text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {groups.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .floating-organizer {
          resize: both;
          overflow: auto;
        }

        /* Mobile Optimizations */
        @media (max-width: 768px) {
          .floating-organizer {
            width: calc(100vw - 2rem) !important;
            max-width: 400px !important;
            left: 1rem !important;
            top: 5rem !important;
          }
        }
      `}</style>
    </div>
  );
}
