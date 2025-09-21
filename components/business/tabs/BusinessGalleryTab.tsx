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
}

export default function BusinessGalleryTab({ businessId }: { businessId: string }) {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const { data: biz } = await supabase
        .from('business_profiles')
        .select('gallery')
        .eq('id', businessId)
        .single();
      
      if (biz?.gallery) {
        setGallery(biz.gallery as GalleryItem[]);
      }
      setLoading(false);
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

        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${businessId}-${Date.now()}-${i}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('business-gallery')
          .upload(fileName, file);

        if (uploadError) {
          console.error(`Failed to upload ${file.name}:`, uploadError);
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
          order: gallery.length + i,
        });
        
        // Update progress
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
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

        if (saveError) throw saveError;

        setMessage(`Successfully uploaded ${newItems.length} image${newItems.length > 1 ? 's' : ''}!`);
      } else {
        setMessage('No valid images were uploaded');
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function deleteImage(itemId: string) {
    if (!confirm('Delete this image?')) return;

    const newGallery = gallery.filter(item => item.id !== itemId);
    setGallery(newGallery);

    const { error } = await supabase
      .from('business_profiles')
      .update({ gallery: newGallery })
      .eq('id', businessId);

    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('Image deleted');
      setTimeout(() => setMessage(''), 3000);
    }
  }

  async function updateImage(itemId: string, updates: Partial<GalleryItem>) {
    const newGallery = gallery.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    setGallery(newGallery);

    await supabase
      .from('business_profiles')
      .update({ gallery: newGallery })
      .eq('id', businessId);
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
    
    await supabase
      .from('business_profiles')
      .update({ gallery: newGallery })
      .eq('id', businessId);
  }

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Gallery</h2>
        {message && (
          <div className={`p-3 rounded-lg mb-4 ${
            message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border border-blue-200">
        <h3 className="text-lg font-bold text-blue-900 mb-4">Upload Images</h3>
        
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center bg-white">
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
          <label htmlFor="gallery-upload" className="cursor-pointer">
            <div className="space-y-2">
              <div className="text-4xl">📸</div>
              <div className="text-sm font-medium text-gray-700">
                {uploading ? `Uploading... ${uploadProgress}%` : 'Click to upload images'}
              </div>
              <div className="text-xs text-gray-500">
                Select multiple images at once (JPG, PNG, GIF up to 5MB each)
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('gallery-upload')?.click();
                }}
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {uploading ? 'Uploading...' : 'Choose Images'}
              </button>
            </div>
          </label>
        </div>
        
        {uploading && uploadProgress > 0 && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Gallery Grid */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Your Images ({gallery.length})</h3>
          {gallery.length > 0 && (
            <p className="text-sm text-gray-500">Click images to edit captions</p>
          )}
        </div>
        
        {gallery.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {gallery.sort((a, b) => a.order - b.order).map((item, index) => (
              <div key={item.id} className="relative group">
                <img
                  src={item.url}
                  alt={item.alt || 'Gallery image'}
                  className="w-full h-32 sm:h-40 object-cover rounded-lg cursor-pointer"
                  onClick={() => {
                    const newCaption = prompt('Enter caption:', item.caption || '');
                    if (newCaption !== null) {
                      updateImage(item.id, { caption: newCaption });
                    }
                  }}
                />
                
                {/* Overlay Controls */}
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col justify-between p-2 pointer-events-none">
                  <div className="flex justify-end gap-2 pointer-events-auto">
                    <button
                      onClick={() => deleteImage(item.id)}
                      className="bg-red-500 text-white p-1.5 rounded hover:bg-red-600"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="pointer-events-auto">
                    <select
                      value={item.visibility}
                      onChange={(e) => updateImage(item.id, { visibility: e.target.value as 'public' | 'private' })}
                      className="w-full bg-white text-xs px-2 py-1 rounded"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>
                
                {/* Caption Display */}
                {item.caption && (
                  <p className="text-xs text-gray-600 mt-1 truncate">{item.caption}</p>
                )}
                
                {/* Order Number (for debugging, remove in production) */}
                <span className="absolute top-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                  {index + 1}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-3">🖼️</div>
            <p>No images yet. Upload your first images above!</p>
            <p className="text-sm mt-2">You can select multiple images at once</p>
          </div>
        )}
      </div>
    </div>
  );
}
