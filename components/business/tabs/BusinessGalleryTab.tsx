// components/business/tabs/BusinessGalleryTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface GalleryItem {
  id: string;
  url: string;
  alt?: string;
  visibility: 'public' | 'private';
  order: number;
}

export default function BusinessGalleryTab({ businessId }: { businessId: string }) {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

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

  async function uploadImage(file: File) {
    setUploading(true);
    setMessage('');

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${businessId}-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('business-gallery')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('business-gallery')
        .getPublicUrl(fileName);

      // Add to gallery
      const newItem: GalleryItem = {
        id: crypto.randomUUID(),
        url: publicUrl,
        alt: '',
        visibility: 'public',
        order: gallery.length,
      };

      const newGallery = [...gallery, newItem];
      setGallery(newGallery);

      // Save to database
      const { error: saveError } = await supabase
        .from('business_profiles')
        .update({ gallery: newGallery })
        .eq('id', businessId);

      if (saveError) throw saveError;

      setMessage('Image uploaded successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    } finally {
      setUploading(false);
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

  async function updateVisibility(itemId: string, visibility: 'public' | 'private') {
    const newGallery = gallery.map(item =>
      item.id === itemId ? { ...item, visibility } : item
    );
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

      {/* Upload Button */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadImage(file);
            }}
            className="hidden"
            disabled={uploading}
          />
          <div className="space-y-2">
            <div className="text-3xl">📸</div>
            <div className="text-sm text-gray-600">
              {uploading ? 'Uploading...' : 'Click to upload image'}
            </div>
            <div className="text-xs text-gray-500">
              JPG, PNG, GIF up to 5MB
            </div>
          </div>
        </label>
      </div>

      {/* Gallery Grid - Mobile Responsive */}
      {gallery.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {gallery.map(item => (
            <div key={item.id} className="relative group">
              <img
                src={item.url}
                alt={item.alt || 'Gallery image'}
                className="w-full h-32 sm:h-40 object-cover rounded-lg"
              />
              {/* Overlay Controls */}
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col justify-between p-2">
                <div className="flex justify-end">
                  <button
                    onClick={() => deleteImage(item.id)}
                    className="bg-red-500 text-white p-1.5 rounded hover:bg-red-600"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex justify-center">
                  <select
                    value={item.visibility}
                    onChange={(e) => updateVisibility(item.id, e.target.value as 'public' | 'private')}
                    className="bg-white text-xs px-2 py-1 rounded"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No images yet. Upload your first image above!
        </div>
      )}
    </div>
  );
}
