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

  useEffect(() => {
    async function load() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          setIsOwner(user.id === businessId);
        }

        // Load gallery with comments and likes
        const { data: biz, error } = await supabase
          .from('business_profiles')
          .select('gallery')
          .eq('id', businessId)
          .single();
        
        if (error) {
          console.error('Error loading gallery:', error);
          setMessage('Error loading gallery');
        } else if (biz?.gallery) {
          // Enhanced gallery items with comments/likes (would need backend support)
          const items = biz.gallery as GalleryItem[];
          // Initialize empty comments/likes if not present
          const enhancedItems = items.map(item => ({
            ...item,
            likes: item.likes || 0,
            comments: item.comments || [],
            liked_by_me: false
          }));
          setGallery(enhancedItems);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setMessage('Unexpected error loading gallery');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [businessId]);

  async function uploadImages(files: FileList) {
    if (files.length === 0) return;
    
    setUploading(true);
    setUploadProgress(0);
    setMessage(`Uploading ${files.length} image${files.length > 1 ? 's' : ''}...`);

    try {
      const newItems: GalleryItem[] = [];
      const totalFiles = files.length;
      let successCount = 0;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          console.warn(`Skipping non-image file: ${file.name}`);
          continue;
        }
        
        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          console.warn(`Skipping large file: ${file.name} (max 5MB)`);
          continue;
        }

        try {
          // Generate unique filename
          const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
          const fileName = `${businessId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('business-gallery')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error(`Failed to upload ${file.name}:`, uploadError);
            
            // If bucket doesn't exist, provide helpful message
            if (uploadError.message?.includes('bucket')) {
              setMessage('Storage bucket not configured. Please create "business-gallery" bucket in Supabase.');
              break;
            }
            continue;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('business-gallery')
            .getPublicUrl(fileName);

          // Add to new items
          newItems.push({
            id: crypto.randomUUID(),
            url: publicUrl,
            alt: file.name.split('.')[0],
            caption: '',
            visibility: 'public',
            order: gallery.length + successCount,
            likes: 0,
            comments: [],
            liked_by_me: false
          });
          
          successCount++;
          
          // Update progress
          setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
        } catch (err) {
          console.error(`Error processing ${file.name}:`, err);
        }
      }

      if (newItems.length > 0) {
        // Add new items to gallery
        const newGallery = [...gallery, ...newItems];
        setGallery(newGallery);

        // Save to database
        const { error: saveError } = await supabase
          .from('business_profiles')
          .update({ gallery: newGallery })
          .eq('id', businessId);

        if (saveError) {
          console.error('Error saving to database:', saveError);
          setMessage('Images uploaded but failed to save. Please try again.');
          setGallery(gallery); // Revert on error
        } else {
          setMessage(`✨ Successfully uploaded ${newItems.length} image${newItems.length > 1 ? 's' : ''}!`);
        }
      } else {
        setMessage('No valid images were uploaded. Please check file types and sizes.');
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setTimeout(() => setMessage(''), 5000);
    } catch (error: any) {
      console.error('Upload error:', error);
      setMessage('Error: ' + (error.message || 'Failed to upload images'));
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
        setMessage('Error deleting image');
        // Revert on error
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
      setMessage('Error deleting image');
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
        setMessage('Error updating image');
        // Revert on error
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
      setMessage('Error updating image');
    }
  }

  async function reorderImages(fromIndex: number, toIndex: number) {
    const newGallery = [...gallery];
    const [movedItem] = newGallery.splice(fromIndex, 1);
    newGallery.splice(toIndex, 0, movedItem);
    
    // Update order numbers
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
      setMessage('Error reordering images');
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

  function openCaptionEditor(item: GalleryItem) {
    setSelectedImage(item);
    setTempCaption(item.caption || '');
    setEditingCaption(true);
  }

  async function saveCaption() {
    if (selectedImage) {
      await updateImage(selectedImage.id, { caption: tempCaption });
      setMessage('✅ Caption saved!');
      setTimeout(() => setMessage(''), 2000);
    }
    setEditingCaption(false);
    setSelectedImage(null);
    setTempCaption('');
  }

  async function toggleLike(item: GalleryItem) {
    if (!currentUser) {
      setMessage('Please sign in to like images');
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

    const newComment: GalleryComment = {
      id: crypto.randomUUID(),
      user_id: currentUser.id,
      user_name: currentUser.email?.split('@')[0] || 'Anonymous',
      text: commentText.trim(),
      created_at: new Date().toISOString()
    };

    const item = gallery.find(i => i.id === imageId);
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
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Gallery Management
        </h2>
        
        {message && (
          <div className={`p-4 rounded-xl mb-4 animate-fade-in flex items-center gap-2 ${
            message.includes('Error') || message.includes('failed') 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            <span className="text-xl">
              {message.includes('Error') ? '⚠️' : message.includes('✅') ? '' : '✨'}
            </span>
            {message}
          </div>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
        <button
          onClick={() => setViewMode('grid')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            viewMode === 'grid' 
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            viewMode === 'collage' 
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            viewMode === 'carousel' 
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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

      {/* Upload Section - Only show for owner */}
      {isOwner && (
        <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 border border-indigo-200 shadow-lg">
          <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">📸</span>
            Upload Images
          </h3>
          
          <div 
            className="border-2 border-dashed border-indigo-300 rounded-xl p-8 text-center bg-white/80 backdrop-blur hover:border-indigo-400 transition-colors cursor-pointer"
            onClick={() => !uploading && fileInputRef.current?.click()}
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
              <div className="text-5xl animate-bounce">
                {uploading ? '⏳' : '🎨'}
              </div>
              <div className="text-lg font-medium text-gray-700">
                {uploading ? `Uploading... ${uploadProgress}%` : 'Drop images here or click to browse'}
              </div>
              <div className="text-sm text-gray-500">
                Select multiple images at once • JPG, PNG, GIF • Max 5MB each
              </div>
              
              {!uploading && (
                <button
                  type="button"
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all shadow-lg font-medium"
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
        </div>
      )}

      {/* Gallery Display */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-2xl">🖼️</span>
            Gallery 
            <span className="text-sm font-normal text-gray-500">({gallery.length} images)</span>
          </h3>
          {isOwner && gallery.length > 1 && (
            <p className="text-sm text-indigo-600 font-medium">
              💡 Drag to reorder • Click to view
            </p>
          )}
        </div>
        
        {gallery.length > 0 ? (
          <>
            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {gallery.sort((a, b) => a.order - b.order).map((item, index) => (
                  <div 
                    key={item.id} 
                    className="relative group"
                    draggable={isOwner}
                    onDragStart={() => isOwner && handleDragStart(index)}
                    onDragOver={isOwner ? handleDragOver : undefined}
                    onDrop={(e) => isOwner && handleDrop(e, index)}
                  >
                    <div 
                      className="relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                      onClick={() => openLightbox(item)}
                    >
                      <img
                        src={item.url}
                        alt={item.alt || 'Gallery image'}
                        className="w-full h-40 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EImage Error%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      
                      {/* Quick Stats Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex justify-between items-center text-white text-sm">
                          <span className="flex items-center gap-1">
                            <span className={item.liked_by_me ? 'text-red-500' : ''}>❤️</span> {item.likes || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            💬 {item.comments?.length || 0}
                          </span>
                        </div>
                      </div>

                      {/* Owner Controls */}
                      {isOwner && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteImage(item.id);
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors shadow-lg"
                            title="Delete image"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Caption Display */}
                    {item.caption && (
                      <div className="mt-2 px-1">
                        <p className="text-xs text-gray-600 line-clamp-2" title={item.caption}>
                          {item.caption}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Collage View */}
            {viewMode === 'collage' && (
              <div className="grid grid-cols-12 grid-rows-6 gap-2 h-[600px]">
                {gallery.slice(0, 7).map((item, index) => {
                  // Different sizes for collage effect
                  const sizeClasses = [
                    'col-span-6 row-span-3', // Large
                    'col-span-3 row-span-2', // Medium
                    'col-span-3 row-span-2', // Medium
                    'col-span-6 row-span-3', // Large
                    'col-span-4 row-span-2', // Medium
                    'col-span-4 row-span-2', // Medium
                    'col-span-4 row-span-2', // Medium
                  ][index] || 'col-span-3 row-span-2';

                  return (
                    <div
                      key={item.id}
                      className={`${sizeClasses} relative overflow-hidden rounded-lg shadow-lg cursor-pointer transform hover:scale-105 transition-all duration-300`}
                      onClick={() => openLightbox(item)}
                    >
                      <img
                        src={item.url}
                        alt={item.alt || 'Gallery image'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end p-3">
                        <div className="text-white">
                          <p className="text-sm font-medium line-clamp-2">{item.caption || 'Untitled'}</p>
                          <div className="flex gap-3 text-xs mt-1">
                            <span>❤️ {item.likes || 0}</span>
                            <span>💬 {item.comments?.length || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {gallery.length > 7 && (
                  <div 
                    className="col-span-3 row-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg flex items-center justify-center text-white cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setViewMode('grid')}
                  >
                    <div className="text-center">
                      <div className="text-3xl font-bold">+{gallery.length - 7}</div>
                      <div className="text-sm">more images</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Carousel View */}
            {viewMode === 'carousel' && (
              <div className="relative">
                <div className="overflow-x-auto pb-4">
                  <div className="flex gap-4" style={{ width: 'max-content' }}>
                    {gallery.sort((a, b) => a.order - b.order).map((item) => (
                      <div
                        key={item.id}
                        className="relative group cursor-pointer"
                        onClick={() => openLightbox(item)}
                      >
                        <img
                          src={item.url}
                          alt={item.alt || 'Gallery image'}
                          className="h-64 w-auto rounded-xl shadow-lg hover:shadow-xl transition-all"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 rounded-b-xl">
                          <p className="text-white font-medium text-sm line-clamp-2">{item.caption || 'Untitled'}</p>
                          <div className="flex gap-3 text-white text-xs mt-2">
                            <span>❤️ {item.likes || 0}</span>
                            <span>💬 {item.comments?.length || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <div className="text-6xl mb-4 animate-pulse">🎨</div>
            <p className="text-lg font-medium mb-2">No images yet!</p>
            {isOwner ? (
              <p className="text-sm">Upload your first images above to showcase your work</p>
            ) : (
              <p className="text-sm">Check back soon for amazing content!</p>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Modal with Comments */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in">
            <div className="flex flex-col md:flex-row h-full">
              {/* Image Section */}
              <div className="md:w-2/3 bg-black flex items-center justify-center p-4 relative">
                <button
                  onClick={closeLightbox}
                  className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                <img
                  src={lightboxImage.url}
                  alt={lightboxImage.alt || 'Gallery image'}
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              {/* Comments & Info Section */}
              <div className="md:w-1/3 bg-white flex flex-col h-[500px] md:h-auto">
                {/* Image Info */}
                <div className="p-4 border-b">
                  {isOwner ? (
                    <button
                      onClick={() => openCaptionEditor(lightboxImage)}
                      className="text-left w-full hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    >
                      <p className="font-medium text-gray-800">{lightboxImage.caption || 'Click to add caption'}</p>
                      <p className="text-xs text-gray-500 mt-1">✏️ Edit caption</p>
                    </button>
                  ) : (
                    <p className="font-medium text-gray-800 p-2">{lightboxImage.caption || 'Untitled'}</p>
                  )}
                  
                  <div className="flex items-center gap-4 mt-3 px-2">
                    <button
                      onClick={() => toggleLike(lightboxImage)}
                      className={`flex items-center gap-1 transition-colors ${
                        lightboxImage.liked_by_me ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
                      }`}
                    >
                      <span className="text-xl">{lightboxImage.liked_by_me ? '❤️' : '🤍'}</span>
                      <span className="text-sm font-medium">{lightboxImage.likes || 0}</span>
                    </button>
                    
                    <select
                      value={lightboxImage.visibility}
                      onChange={(e) => isOwner && updateImage(lightboxImage.id, { visibility: e.target.value as 'public' | 'private' })}
                      className="text-sm px-2 py-1 border rounded-lg"
                      disabled={!isOwner}
                    >
                      <option value="public">🌍 Public</option>
                      <option value="private">🔒 Private</option>
                    </select>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <h4 className="font-semibold text-gray-800 mb-3">Comments</h4>
                  
                  {lightboxImage.comments && lightboxImage.comments.length > 0 ? (
                    lightboxImage.comments.map((comment) => (
                      <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {comment.user_name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-800">{comment.user_name || 'Anonymous'}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(comment.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{comment.text}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">No comments yet. Be the first!</p>
                  )}
                </div>

                {/* Add Comment */}
                {currentUser && (
                  <div className="p-4 border-t bg-gray-50">
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
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      />
                      <button
                        onClick={() => addComment(lightboxImage.id)}
                        disabled={!commentText.trim()}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                      >
                        Post
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Caption Editor Modal */}
      {editingCaption && selectedImage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Edit Caption</h3>
            
            <div className="mb-4">
              <img 
                src={selectedImage.url} 
                alt={selectedImage.alt}
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
            
            <textarea
              value={tempCaption}
              onChange={(e) => setTempCaption(e.target.value)}
              placeholder="Add a caption to describe this image..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              rows={3}
              maxLength={200}
            />
            
            <div className="flex justify-between items-center mt-2 mb-4">
              <span className="text-xs text-gray-500">
                {tempCaption.length}/200 characters
              </span>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setEditingCaption(false);
                  setSelectedImage(null);
                  setTempCaption('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveCaption}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
              >
                Save Caption
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
      `}</style>
    </div>
  );
}
