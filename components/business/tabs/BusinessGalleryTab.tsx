// components/business/tabs/BusinessGalleryTab.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface GalleryItem {
  id: string;
  url: string;
  alt?: string;
  caption?: string;
  visibility: 'public' | 'private';
  order: number;
  likes?: number;
  comments?: GalleryComment[];
  liked_by_me?: boolean;
  allow_comments?: boolean;
  allow_reactions?: boolean;
}

interface GalleryComment {
  id: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  text: string;
  created_at: string;
}

export default function BusinessGalleryTab({ businessId }: { businessId: string }) {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [tempCaption, setTempCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'collage' | 'carousel'>('grid');
  const [lightboxImage, setLightboxImage] = useState<GalleryItem | null>(null);
  const [commentText, setCommentText] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  const [editingSettings, setEditingSettings] = useState(false);
  const [tempAllowComments, setTempAllowComments] = useState(false);
  const [tempAllowReactions, setTempAllowReactions] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        console.log('🔍 Gallery Debug Info:');
        console.log('Current User:', user?.id);
        console.log('Business ID:', businessId);
        console.log('Is Owner:', user?.id === businessId);
        
        if (user) {
          setCurrentUser(user);
          const ownerStatus = user.id === businessId;
          setIsOwner(ownerStatus);
          setDebugInfo(`User: ${user.email} | Owner: ${ownerStatus ? 'Yes ✅' : 'No ❌'}`);
        } else {
          setDebugInfo('Not logged in');
          console.log('⚠️ No user logged in');
        }

        const { data: biz, error } = await supabase
          .from('business_profiles')
          .select('gallery')
          .eq('id', businessId)
          .single();
        
        if (error) {
          console.error('Error loading gallery:', error);
          setMessage('❌ Error loading gallery: ' + error.message);
        } else if (biz?.gallery) {
          const items = biz.gallery as GalleryItem[];
          const enhancedItems = items.map(item => ({
            ...item,
            likes: item.likes || 0,
            comments: item.comments || [],
            liked_by_me: false,
            allow_comments: item.allow_comments ?? false,
            allow_reactions: item.allow_reactions ?? false
          }));
          setGallery(enhancedItems);
          console.log('✅ Loaded', enhancedItems.length, 'images');
        } else {
          console.log('📭 No gallery data found');
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setMessage('❌ Unexpected error loading gallery');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [businessId]);

  async function uploadImages(files: FileList) {
    if (files.length === 0) return;
    
    console.log('📤 Starting upload of', files.length, 'files');
    setUploading(true);
    setUploadProgress(0);
    setMessage(`⏳ Uploading ${files.length} image${files.length > 1 ? 's' : ''}...`);

    try {
      const newItems: GalleryItem[] = [];
      const totalFiles = files.length;
      let successCount = 0;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Processing file ${i + 1}/${totalFiles}:`, file.name);
        
        if (!file.type.startsWith('image/')) {
          console.warn(`⚠️ Skipping non-image file: ${file.name}`);
          setMessage(`⚠️ Skipped ${file.name} - not an image`);
          continue;
        }
        
        if (file.size > 5 * 1024 * 1024) {
          console.warn(`⚠️ Skipping large file: ${file.name}`);
          setMessage(`⚠️ Skipped ${file.name} - exceeds 5MB limit`);
          continue;
        }

        try {
          const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
          const fileName = `${businessId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          console.log('📤 Uploading to Supabase:', fileName);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('business-gallery')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error(`❌ Failed to upload ${file.name}:`, uploadError);
            
            if (uploadError.message?.includes('bucket') || uploadError.message?.includes('not found')) {
              setMessage('❌ Storage bucket not configured. Check Supabase storage settings.');
              console.error('🔧 SOLUTION: Create "business-gallery" bucket in Supabase Storage');
              break;
            }
            
            setMessage(`❌ Upload failed: ${uploadError.message}`);
            continue;
          }

          console.log('✅ Upload successful:', uploadData);

          const { data: { publicUrl } } = supabase.storage
            .from('business-gallery')
            .getPublicUrl(fileName);

          console.log('🔗 Public URL:', publicUrl);

          newItems.push({
            id: crypto.randomUUID(),
            url: publicUrl,
            alt: file.name.split('.')[0],
            caption: '',
            visibility: 'public',
            order: gallery.length + successCount,
            likes: 0,
            comments: [],
            liked_by_me: false,
            allow_comments: false,
            allow_reactions: false
          });
          
          successCount++;
          setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
        } catch (err) {
          console.error(`❌ Error processing ${file.name}:`, err);
        }
      }

      if (newItems.length > 0) {
        console.log('💾 Saving', newItems.length, 'new images to database');
        
        const newGallery = [...gallery, ...newItems];
        setGallery(newGallery);

        const { error: saveError } = await supabase
          .from('business_profiles')
          .update({ gallery: newGallery })
          .eq('id', businessId);

        if (saveError) {
          console.error('❌ Error saving to database:', saveError);
          setMessage('❌ Images uploaded but failed to save. Please refresh and try again.');
          setGallery(gallery);
        } else {
          console.log('✅ Successfully saved to database');
          setMessage(`✨ Successfully uploaded ${newItems.length} image${newItems.length > 1 ? 's' : ''}! Tap any image to enable comments/reactions.`);
        }
      } else {
        setMessage('❌ No valid images were uploaded. Check file types and sizes.');
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setTimeout(() => setMessage(''), 6000);
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      setMessage('❌ Error: ' + (error.message || 'Failed to upload images'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function deleteImage(itemId: string) {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const newGallery = gallery.filter(item => item.id !== itemId);
      setGallery(newGallery);

      const { error } = await supabase
        .from('business_profiles')
        .update({ gallery: newGallery })
        .eq('id', businessId);

      if (error) {
        console.error('Delete error:', error);
        setMessage('❌ Error deleting image');
        const { data: biz } = await supabase
          .from('business_profiles')
          .select('gallery')
          .eq('id', businessId)
          .single();
        if (biz?.gallery) {
          setGallery(biz.gallery as GalleryItem[]);
        }
      } else {
        setMessage('✅ Image deleted successfully');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      console.error('Delete error:', err);
      setMessage('❌ Error deleting image');
    }
  }

  async function updateImage(itemId: string, updates: Partial<GalleryItem>) {
    try {
      const newGallery = gallery.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      );
      setGallery(newGallery);

      const { error } = await supabase
        .from('business_profiles')
        .update({ gallery: newGallery })
        .eq('id', businessId);

      if (error) {
        console.error('Update error:', error);
        setMessage('❌ Error updating image');
        const { data: biz } = await supabase
          .from('business_profiles')
          .select('gallery')
          .eq('id', businessId)
          .single();
        if (biz?.gallery) {
          setGallery(biz.gallery as GalleryItem[]);
        }
      }
    } catch (err) {
      console.error('Update error:', err);
      setMessage('❌ Error updating image');
    }
  }

  async function reorderImages(fromIndex: number, toIndex: number) {
    const newGallery = [...gallery];
    const [movedItem] = newGallery.splice(fromIndex, 1);
    newGallery.splice(toIndex, 0, movedItem);
    
    newGallery.forEach((item, index) => {
      item.order = index;
    });
    
    setGallery(newGallery);
    
    const { error } = await supabase
      .from('business_profiles')
      .update({ gallery: newGallery })
      .eq('id', businessId);

    if (error) {
      console.error('Reorder error:', error);
      setMessage('❌ Error reordering images');
    }
  }

  function handleDragStart(index: number) {
    setDraggedItem(index);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (draggedItem !== null && draggedItem !== dropIndex) {
      reorderImages(draggedItem, dropIndex);
    }
    setDraggedItem(null);
  }

  function openSettingsEditor(item: GalleryItem) {
    setSelectedImage(item);
    setTempCaption(item.caption || '');
    setTempAllowComments(item.allow_comments ?? false);
    setTempAllowReactions(item.allow_reactions ?? false);
    setEditingSettings(true);
  }

  async function saveSettings() {
    if (selectedImage) {
      await updateImage(selectedImage.id, { 
        caption: tempCaption,
        allow_comments: tempAllowComments,
        allow_reactions: tempAllowReactions
      });
      setMessage('✅ Settings saved!');
      setTimeout(() => setMessage(''), 2000);
    }
    setEditingSettings(false);
    setSelectedImage(null);
    setTempCaption('');
    setTempAllowComments(false);
    setTempAllowReactions(false);
  }

  async function toggleLike(item: GalleryItem) {
    if (!currentUser) {
      setMessage('Please sign in to like images');
      return;
    }

    if (!item.allow_reactions) {
      return;
    }

    const newLikeState = !item.liked_by_me;
    const newLikeCount = newLikeState ? (item.likes || 0) + 1 : Math.max(0, (item.likes || 0) - 1);
    
    await updateImage(item.id, {
      liked_by_me: newLikeState,
      likes: newLikeCount
    });
  }

  async function addComment(imageId: string) {
    if (!currentUser || !commentText.trim()) return;

    const item = gallery.find(i => i.id === imageId);
    
    if (!item?.allow_comments) {
      setMessage('Comments are disabled for this image');
      return;
    }

    const newComment: GalleryComment = {
      id: crypto.randomUUID(),
      user_id: currentUser.id,
      user_name: currentUser.email?.split('@')[0] || 'Anonymous',
      text: commentText.trim(),
      created_at: new Date().toISOString()
    };

    if (item) {
      const updatedComments = [...(item.comments || []), newComment];
      await updateImage(imageId, { comments: updatedComments });
      setCommentText('');
    }
  }

  function openLightbox(item: GalleryItem) {
    setLightboxImage(item);
  }

  function closeLightbox() {
    setLightboxImage(null);
    setCommentText('');
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-2 text-gray-600">Loading gallery...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Gallery Management
        </h2>
        
        {/* Debug Info */}
        <div className="text-xs text-gray-500 mb-3 sm:mb-4 font-mono bg-gray-50 p-2 rounded">
          {debugInfo}
        </div>
        
        {message && (
          <div className={`p-3 sm:p-4 rounded-xl mb-3 sm:mb-4 animate-fade-in flex items-start gap-2 text-sm sm:text-base ${
            message.includes('❌') || message.includes('⚠️')
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Upload Section - Mobile Optimized */}
      <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg ${
        isOwner 
          ? 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-indigo-200'
          : 'bg-gray-50 border-gray-300'
      }`}>
        <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2">
          <span className="text-xl sm:text-2xl">📸</span>
          <span className={isOwner ? 'text-indigo-900' : 'text-gray-700'}>
            Upload Images
          </span>
        </h3>
        
        {isOwner ? (
          <>
            <div 
              className="border-2 border-dashed border-indigo-300 rounded-xl p-6 sm:p-8 text-center bg-white/80 backdrop-blur hover:border-indigo-400 active:border-indigo-500 transition-colors cursor-pointer touch-manipulation"
              onClick={() => !uploading && fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const files = e.dataTransfer.files;
                if (files && !uploading) {
                  uploadImages(files);
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    uploadImages(e.target.files);
                  }
                }}
                className="hidden"
                disabled={uploading}
                id="gallery-upload"
              />
              
              <div className="space-y-3">
                <div className="text-4xl sm:text-5xl animate-bounce">
                  {uploading ? '⏳' : '🎨'}
                </div>
                <div className="text-base sm:text-lg font-medium text-gray-700">
                  {uploading ? `Uploading... ${uploadProgress}%` : 'Tap to select images'}
                </div>
                <div className="text-xs sm:text-sm text-gray-500 px-2">
                  Multiple images • JPG, PNG, GIF • Max 5MB each
                </div>
                <div className="text-xs sm:text-sm text-indigo-600 font-medium mt-2 px-2">
                  💡 Comments & reactions disabled by default. Tap any image to enable.
                </div>
                
                {!uploading && (
                  <button
                    type="button"
                    className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 active:scale-95 transition-all shadow-lg font-medium text-sm sm:text-base min-h-[48px] touch-manipulation"
                  >
                    Choose Images
                  </button>
                )}
              </div>
            </div>
            
            {uploading && uploadProgress > 0 && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-300 animate-pulse"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <div className="text-3xl sm:text-4xl mb-3">🔒</div>
            <p className="text-sm sm:text-base text-gray-600 mb-2 px-4">
              You don't have permission to upload to this gallery
            </p>
            <p className="text-xs sm:text-sm text-gray-500 px-4">
              Only the business owner can add images
            </p>
            {currentUser ? (
              <p className="text-xs text-gray-400 mt-2 px-4 break-words">
                Logged in as: {currentUser.email}
              </p>
            ) : (
              <p className="text-xs text-red-500 mt-2">
                ⚠️ You are not logged in
              </p>
            )}
          </div>
        )}
      </div>

      {/* View Mode Toggle - Mobile Optimized */}
      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
        <button
          onClick={() => setViewMode('grid')}
          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium transition-all text-sm sm:text-base min-h-[44px] touch-manipulation ${
            viewMode === 'grid' 
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
              : 'bg-gray-100 text-gray-700 active:bg-gray-200'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Grid
          </span>
        </button>
        <button
          onClick={() => setViewMode('collage')}
          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium transition-all text-sm sm:text-base min-h-[44px] touch-manipulation ${
            viewMode === 'collage' 
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
              : 'bg-gray-100 text-gray-700 active:bg-gray-200'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Collage
          </span>
        </button>
        <button
          onClick={() => setViewMode('carousel')}
          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium transition-all text-sm sm:text-base min-h-[44px] touch-manipulation ${
            viewMode === 'carousel' 
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
              : 'bg-gray-100 text-gray-700 active:bg-gray-200'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4" />
            </svg>
            Carousel
          </span>
        </button>
      </div>

      {/* Gallery Display - Mobile Optimized */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-2">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-xl sm:text-2xl">🖼️</span>
            Gallery 
            <span className="text-xs sm:text-sm font-normal text-gray-500">({gallery.length})</span>
          </h3>
          {isOwner && gallery.length > 1 && (
            <p className="text-xs sm:text-sm text-indigo-600 font-medium">
              💡 Tap to view • {gallery.length > 1 && 'Drag to reorder'}
            </p>
          )}
        </div>
        
        {gallery.length > 0 ? (
          <>
            {/* Grid View - Mobile Optimized */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {gallery.sort((a, b) => a.order - b.order).map((item, index) => (
                  <div 
                    key={item.id} 
                    className="relative group touch-manipulation"
                    draggable={isOwner}
                    onDragStart={() => isOwner && handleDragStart(index)}
                    onDragOver={isOwner ? handleDragOver : undefined}
                    onDrop={(e) => isOwner && handleDrop(e, index)}
                  >
                    <div 
                      className="relative overflow-hidden rounded-lg sm:rounded-xl shadow-md active:shadow-xl transition-all duration-300 cursor-pointer"
                      onClick={() => openLightbox(item)}
                    >
                      <img
                        src={item.url}
                        alt={item.alt || 'Gallery image'}
                        className="w-full h-32 sm:h-40 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EError%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      
                      {/* Settings Indicators - Larger on mobile */}
                      {isOwner && (
                        <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 flex gap-1">
                          {item.allow_reactions && (
                            <span className="bg-red-500 text-white px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium shadow-md">
                              ❤️
                            </span>
                          )}
                          {item.allow_comments && (
                            <span className="bg-blue-500 text-white px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium shadow-md">
                              💬
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Stats Overlay - Better touch area */}
                      {(item.allow_reactions || item.allow_comments) && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 sm:p-3 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                          <div className="flex justify-between items-center text-white text-xs sm:text-sm">
                            {item.allow_reactions && (
                              <span className="flex items-center gap-1">
                                <span className={item.liked_by_me ? 'text-red-500' : ''}>❤️</span> {item.likes || 0}
                              </span>
                            )}
                            {item.allow_comments && (
                              <span className="flex items-center gap-1">
                                💬 {item.comments?.length || 0}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Owner Controls - Larger touch targets */}
                      {isOwner && (
                        <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openSettingsEditor(item);
                            }}
                            className="bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white p-2 sm:p-2.5 rounded-full transition-colors shadow-lg min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center touch-manipulation"
                            title="Edit settings"
                          >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteImage(item.id);
                            }}
                            className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white p-2 sm:p-2.5 rounded-full transition-colors shadow-lg min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center touch-manipulation"
                            title="Delete image"
                          >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Caption Display */}
                    {item.caption && (
                      <div className="mt-2 px-1">
                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2" title={item.caption}>
                          {item.caption}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Collage View - Mobile adjusted */}
            {viewMode === 'collage' && (
              <div className="grid grid-cols-12 grid-rows-6 gap-2 h-[400px] sm:h-[600px]">
                {gallery.slice(0, 7).map((item, index) => {
                  const sizeClasses = [
                    'col-span-6 row-span-3',
                    'col-span-3 row-span-2',
                    'col-span-3 row-span-2',
                    'col-span-6 row-span-3',
                    'col-span-4 row-span-2',
                    'col-span-4 row-span-2',
                    'col-span-4 row-span-2',
                  ][index] || 'col-span-3 row-span-2';

                  return (
                    <div
                      key={item.id}
                      className={`${sizeClasses} relative overflow-hidden rounded-lg shadow-lg cursor-pointer active:scale-105 transition-all duration-300 touch-manipulation`}
                      onClick={() => openLightbox(item)}
                    >
                      <img
                        src={item.url}
                        alt={item.alt || 'Gallery image'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 active:opacity-100 transition-opacity flex items-end p-2 sm:p-3">
                        <div className="text-white">
                          <p className="text-xs sm:text-sm font-medium line-clamp-2">{item.caption || 'Untitled'}</p>
                          {(item.allow_reactions || item.allow_comments) && (
                            <div className="flex gap-2 sm:gap-3 text-xs mt-1">
                              {item.allow_reactions && <span>❤️ {item.likes || 0}</span>}
                              {item.allow_comments && <span>💬 {item.comments?.length || 0}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {gallery.length > 7 && (
                  <div 
                    className="col-span-3 row-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg flex items-center justify-center text-white cursor-pointer active:scale-105 transition-transform touch-manipulation"
                    onClick={() => setViewMode('grid')}
                  >
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold">+{gallery.length - 7}</div>
                      <div className="text-xs sm:text-sm">more</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Carousel View - Touch scrolling */}
            {viewMode === 'carousel' && (
              <div className="relative">
                <div className="overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory">
                  <div className="flex gap-3 sm:gap-4" style={{ width: 'max-content' }}>
                    {gallery.sort((a, b) => a.order - b.order).map((item) => (
                      <div
                        key={item.id}
                        className="relative group cursor-pointer snap-center touch-manipulation"
                        onClick={() => openLightbox(item)}
                      >
                        <img
                          src={item.url}
                          alt={item.alt || 'Gallery image'}
                          className="h-48 sm:h-64 w-auto rounded-xl shadow-lg hover:shadow-xl transition-all"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 sm:p-4 rounded-b-xl">
                          <p className="text-white font-medium text-xs sm:text-sm line-clamp-2">{item.caption || 'Untitled'}</p>
                          {(item.allow_reactions || item.allow_comments) && (
                            <div className="flex gap-2 sm:gap-3 text-white text-xs mt-2">
                              {item.allow_reactions && <span>❤️ {item.likes || 0}</span>}
                              {item.allow_comments && <span>💬 {item.comments?.length || 0}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 sm:py-16 text-gray-500">
            <div className="text-5xl sm:text-6xl mb-4 animate-pulse">🎨</div>
            <p className="text-base sm:text-lg font-medium mb-2">No images yet!</p>
            {isOwner ? (
              <p className="text-sm px-4">Upload your first images above to showcase your work</p>
            ) : (
              <p className="text-sm px-4">Check back soon for amazing content!</p>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Modal - Mobile Optimized */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-none sm:rounded-2xl w-full h-full sm:max-w-6xl sm:w-full sm:max-h-[90vh] sm:h-auto overflow-hidden shadow-2xl animate-fade-in flex flex-col">
            <div className="flex flex-col h-full">
              {/* Image Section - Full screen on mobile */}
              <div className="relative bg-black flex items-center justify-center flex-1 sm:flex-none sm:h-[60vh]">
                <button
                  onClick={closeLightbox}
                  className="absolute top-4 right-4 text-white hover:text-gray-300 active:text-gray-400 z-10 bg-black/50 rounded-full p-3 min-w-[48px] min-h-[48px] flex items-center justify-center touch-manipulation"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                <img
                  src={lightboxImage.url}
                  alt={lightboxImage.alt || 'Gallery image'}
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              {/* Info Section - Sliding drawer on mobile */}
              <div className="bg-white flex flex-col max-h-[40vh] sm:max-h-[30vh] overflow-hidden">
                {/* Image Info */}
                <div className="p-4 border-b shrink-0">
                  {isOwner ? (
                    <button
                      onClick={() => {
                        closeLightbox();
                        openSettingsEditor(lightboxImage);
                      }}
                      className="text-left w-full hover:bg-gray-50 active:bg-gray-100 p-3 rounded-lg transition-colors min-h-[44px] touch-manipulation"
                    >
                      <p className="font-medium text-gray-800 text-sm sm:text-base">{lightboxImage.caption || 'Tap to add caption'}</p>
                      <p className="text-xs text-gray-500 mt-1">✏️ Edit settings</p>
                    </button>
                  ) : (
                    <p className="font-medium text-gray-800 p-2 text-sm sm:text-base">{lightboxImage.caption || 'Untitled'}</p>
                  )}
                  
                  <div className="flex items-center gap-3 sm:gap-4 mt-3 px-2">
                    {lightboxImage.allow_reactions && (
                      <button
                        onClick={() => toggleLike(lightboxImage)}
                        className={`flex items-center gap-1.5 transition-colors min-h-[44px] px-2 touch-manipulation ${
                          lightboxImage.liked_by_me ? 'text-red-500' : 'text-gray-600 active:text-red-500'
                        }`}
                      >
                        <span className="text-xl sm:text-2xl">{lightboxImage.liked_by_me ? '❤️' : '🤍'}</span>
                        <span className="text-sm font-medium">{lightboxImage.likes || 0}</span>
                      </button>
                    )}
                    
                    {!lightboxImage.allow_reactions && !lightboxImage.allow_comments && (
                      <span className="text-xs text-gray-500">
                        💼 Professional view
                      </span>
                    )}
                    
                    {isOwner && (
                      <select
                        value={lightboxImage.visibility}
                        onChange={(e) => updateImage(lightboxImage.id, { visibility: e.target.value as 'public' | 'private' })}
                        className="text-xs sm:text-sm px-2 py-2 border rounded-lg ml-auto min-h-[44px] touch-manipulation"
                      >
                        <option value="public">🌍 Public</option>
                        <option value="private">🔒 Private</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Comments Section - Scrollable */}
                {lightboxImage.allow_comments ? (
                  <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                      <h4 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">Comments</h4>
                      
                      {lightboxImage.comments && lightboxImage.comments.length > 0 ? (
                        lightboxImage.comments.map((comment) => (
                          <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold shrink-0">
                                {comment.user_name?.[0]?.toUpperCase() || '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-xs sm:text-sm font-medium text-gray-800">{comment.user_name || 'Anonymous'}</span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(comment.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm text-gray-700 break-words">{comment.text}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-500 py-6 text-sm">No comments yet. Be the first!</p>
                      )}
                    </div>

                    {/* Add Comment - Fixed at bottom */}
                    {currentUser && (
                      <div className="p-4 border-t bg-gray-50 shrink-0">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && commentText.trim()) {
                                addComment(lightboxImage.id);
                              }
                            }}
                            placeholder="Add a comment..."
                            className="flex-1 px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm min-h-[48px] touch-manipulation"
                          />
                          <button
                            onClick={() => addComment(lightboxImage.id)}
                            disabled={!commentText.trim()}
                            className="px-4 sm:px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium min-h-[48px] whitespace-nowrap touch-manipulation"
                          >
                            Post
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-500 min-h-0">
                    <div>
                      <div className="text-3xl sm:text-4xl mb-2">💼</div>
                      <p className="text-sm">Comments are disabled</p>
                      {isOwner && (
                        <button
                          onClick={() => {
                            closeLightbox();
                            openSettingsEditor(lightboxImage);
                          }}
                          className="mt-3 text-xs text-indigo-600 active:text-indigo-700 font-medium min-h-[44px] px-4 touch-manipulation"
                        >
                          Enable in settings
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Editor Modal - Mobile Optimized */}
      {editingSettings && selectedImage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl animate-fade-in">
            <h3 className="text-base sm:text-lg font-bold mb-4 text-gray-800">Image Settings</h3>
            
            <div className="mb-4">
              <img 
                src={selectedImage.url} 
                alt={selectedImage.alt}
                className="w-full h-40 sm:h-48 object-cover rounded-lg"
              />
            </div>
            
            {/* Caption */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
              <textarea
                value={tempCaption}
                onChange={(e) => setTempCaption(e.target.value)}
                placeholder="Add a caption to describe this image..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm sm:text-base min-h-[100px] touch-manipulation"
                rows={3}
                maxLength={200}
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500">
                  {tempCaption.length}/200 characters
                </span>
              </div>
            </div>

            {/* Engagement Settings - Touch friendly */}
            <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Engagement Settings</h4>
              
              {/* Allow Reactions Toggle */}
              <label className="flex items-center justify-between cursor-pointer min-h-[60px] touch-manipulation">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">❤️</span>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Enable Reactions</div>
                    <div className="text-xs text-gray-500">Allow visitors to like this image</div>
                  </div>
                </div>
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    checked={tempAllowReactions}
                    onChange={(e) => setTempAllowReactions(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-indigo-600 touch-manipulation"></div>
                </div>
              </label>

              {/* Allow Comments Toggle */}
              <label className="flex items-center justify-between cursor-pointer min-h-[60px] touch-manipulation">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💬</span>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Enable Comments</div>
                    <div className="text-xs text-gray-500">Allow visitors to comment</div>
                  </div>
                </div>
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    checked={tempAllowComments}
                    onChange={(e) => setTempAllowComments(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-indigo-600 touch-manipulation"></div>
                </div>
              </label>

              {!tempAllowReactions && !tempAllowComments && (
                <div className="mt-2 p-3 bg-indigo-50 rounded-lg">
                  <p className="text-xs text-indigo-700">
                    💼 <strong>Professional Mode:</strong> Clean portfolio display without social features.
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setEditingSettings(false);
                  setSelectedImage(null);
                  setTempCaption('');
                  setTempAllowComments(false);
                  setTempAllowReactions(false);
                }}
                className="px-4 sm:px-6 py-3 text-gray-600 hover:text-gray-800 active:text-gray-900 transition-colors min-h-[48px] touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                className="px-6 sm:px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 active:scale-95 transition-all shadow-lg min-h-[48px] touch-manipulation"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .touch-manipulation {
          touch-action: manipulation;
        }

        /* Improve mobile scrolling */
        .overflow-x-auto {
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
        }

        .overflow-x-auto::-webkit-scrollbar {
          height: 4px;
        }

        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 4px;
        }

        /* Snap scrolling for carousel */
        .snap-x {
          scroll-snap-type: x mandatory;
        }

        .snap-center {
          scroll-snap-align: center;
        }
      `}</style>
    </div>
  );
}
