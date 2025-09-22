// components/business/tabs/BusinessBasicTab.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import BusinessInviteQR from '@/components/business/BusinessInviteQR';

interface Service {
  id: string;
  name: string;
  description?: string;
  duration?: string;
  price?: string;
  available: boolean;
}

interface BusinessBasic {
  display_name: string;
  handle: string;
  tagline?: string;
  bio?: string;
  logo_url?: string;
  cover_url?: string;
  amenities?: string[];
  categories?: string[];
  services?: Service[];
  
  // Contact fields
  phone?: string;
  phone_public?: boolean;
  email?: string;
  email_public?: boolean;
  website_url?: string;
  booking_url?: string;
  location_text?: string;
  location_city?: string;
  location_state?: string;
  location_is_public?: boolean;
  
  // Social links
  social_links?: Record<string, string>;
}

const amenityOptions = [
  'Wheelchair Accessible', 'Parking', 'WiFi', 'Pet Friendly',
  'Gender Neutral Restroom', 'Air Conditioning', 'Outdoor Seating',
  'Private Rooms', 'Group Sessions', 'Online Services'
];

const socialPlatforms = [
  { id: 'facebook', label: 'Facebook', icon: '👤', placeholder: 'facebook.com/yourbusiness' },
  { id: 'instagram', label: 'Instagram', icon: '📷', placeholder: 'instagram.com/yourbusiness' },
  { id: 'twitter', label: 'Twitter/X', icon: '🐦', placeholder: 'twitter.com/yourbusiness' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼', placeholder: 'linkedin.com/company/yourbusiness' },
  { id: 'youtube', label: 'YouTube', icon: '📺', placeholder: 'youtube.com/@yourbusiness' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵', placeholder: 'tiktok.com/@yourbusiness' },
];

// Custom cover photo uploader component
function CoverPhotoUploader({ 
  businessId, 
  value, 
  onChange 
}: { 
  businessId: string; 
  value?: string; 
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [clientUser, setClientUser] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check client-side auth
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setClientUser(session.user);
        console.log('User authenticated:', session.user.email);
        // Try to refresh session to fix database auth
        await supabase.auth.refreshSession();
      }
    }
    checkAuth();
  }, []);

  async function uploadCover(file: File) {
    setUploading(true);
    try {
      // Use businessId in filename to avoid auth issues
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const fileName = `business-${businessId}-cover-${timestamp}-${randomString}.${fileExt}`;
      
      console.log('Uploading:', fileName);
      
      // Try avatars bucket first (usually most permissive)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Storage error:', uploadError);
        
        // If storage fails, convert to base64 as fallback
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = () => {
          const base64 = reader.result as string;
          if (base64.length < 1400000) { // Under ~1MB encoded
            onChange(base64);
            alert('Image stored locally. Click Save to persist.');
          } else {
            alert('Image too large. Please use a smaller image (under 1MB).');
          }
        };
        
        reader.onerror = () => {
          alert('Failed to read image file');
        };
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        
        console.log('Upload successful:', publicUrl);
        onChange(publicUrl);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      uploadCover(file);
    }
  }

  function handlePositionChange(axis: 'x' | 'y', value: number) {
    setPosition(prev => ({ ...prev, [axis]: value }));
  }

  return (
    <div className="space-y-3">
      <div 
        className={`relative w-full h-48 md:h-64 rounded-xl overflow-hidden border-2 ${
          dragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-gray-50'
        } transition-all cursor-pointer`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadCover(file);
          }}
        />
        
        {value ? (
          <div 
            className="relative w-full h-full"
            style={{
              backgroundImage: `url(${value})`,
              backgroundPosition: `${position.x}% ${position.y}%`,
              backgroundSize: 'cover',
            }}
          >
            <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-white text-center">
                <p className="text-lg font-medium">Click to change</p>
                <p className="text-sm">or drag & drop new image</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-3"></div>
                  <p className="text-gray-600">Uploading...</p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-3">🖼️</div>
                  <p className="text-gray-700 font-medium">Click to upload cover photo</p>
                  <p className="text-sm text-gray-500 mt-1">or drag & drop</p>
                  <p className="text-xs text-gray-400 mt-2">Recommended: 1600x400px</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Image Position Adjustment */}
      {value && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-gray-700 mb-2">Adjust Image Position:</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Horizontal</label>
              <input
                type="range"
                min="0"
                max="100"
                value={position.x}
                onChange={(e) => handlePositionChange('x', Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Vertical</label>
              <input
                type="range"
                min="0"
                max="100"
                value={position.y}
                onChange={(e) => handlePositionChange('y', Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Logo uploader component (simplified)
function LogoUploader({ 
  businessId, 
  value, 
  onChange 
}: { 
  businessId: string; 
  value?: string; 
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [clientUser, setClientUser] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check client-side auth
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setClientUser(session.user);
        // Try to refresh session to fix database auth
        await supabase.auth.refreshSession();
      }
    }
    checkAuth();
  }, []);

  async function uploadLogo(file: File) {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const fileName = `business-${businessId}-logo-${timestamp}-${randomString}.${fileExt}`;
      
      console.log('Uploading logo:', fileName);
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Storage error:', error);
        
        // Fallback to base64
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = () => {
          const base64 = reader.result as string;
          if (base64.length < 1400000) {
            onChange(base64);
            alert('Image stored locally. Click Save to persist.');
          } else {
            alert('Image too large. Please use a smaller image.');
          }
        };
        
        reader.onerror = () => {
          alert('Failed to read image file');
        };
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        
        console.log('Logo upload successful:', publicUrl);
        onChange(publicUrl);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div 
      className="w-24 h-24 rounded-full border-2 border-gray-300 overflow-hidden cursor-pointer hover:border-purple-500 transition-colors"
      onClick={() => !uploading && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadLogo(file);
        }}
      />
      
      {value ? (
        <img src={value} alt="Logo" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gray-50 flex items-center justify-center">
          {uploading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          ) : (
            <div className="text-center">
              <div className="text-2xl">📷</div>
              <p className="text-xs text-gray-500">Logo</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BusinessBasicTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState<BusinessBasic>({
    display_name: '',
    handle: '',
    social_links: {},
    services: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [newService, setNewService] = useState<Service>({
    id: '',
    name: '',
    description: '',
    duration: '',
    price: '',
    available: true
  });
  const [showServiceForm, setShowServiceForm] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: biz } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', businessId)
        .single();
      
      if (biz) {
        // Parse services from JSON if stored as JSONB
        let services: Service[] = [];
        if (biz.services) {
          if (typeof biz.services === 'string') {
            try {
              services = JSON.parse(biz.services);
            } catch {
              services = [];
            }
          } else if (Array.isArray(biz.services)) {
            services = biz.services;
          }
        }

        setData({
          display_name: biz.display_name || '',
          handle: biz.handle || '',
          tagline: biz.tagline || '',
          bio: biz.bio || '',
          logo_url: biz.logo_url || '',
          cover_url: biz.cover_url || '',
          amenities: biz.amenities || [],
          categories: biz.categories || [],
          services: services,
          phone: biz.phone || '',
          phone_public: biz.phone_public || false,
          email: biz.email || '',
          email_public: biz.email_public || false,
          website_url: biz.website_url || '',
          booking_url: biz.booking_url || '',
          location_text: biz.location_text || '',
          location_city: biz.location_city || '',
          location_state: biz.location_state || '',
          location_is_public: biz.location_is_public !== false,
          social_links: biz.social_links || {}
        });
      }
      setLoading(false);
    }
    load();
  }, [businessId]);

  async function save() {
    if (!data.display_name || !data.handle) {
      setMessage('Name and handle are required');
      return;
    }

    setSaving(true);
    setMessage('');
    
    const { error } = await supabase
      .from('business_profiles')
      .update({
        ...data,
        services: data.services, // Save services as JSONB
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId);
    
    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('Saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  }

  function addService() {
    if (!newService.name.trim()) {
      alert('Please enter a service name');
      return;
    }

    const service: Service = {
      ...newService,
      id: crypto.randomUUID()
    };

    setData({
      ...data,
      services: [...(data.services || []), service]
    });

    setNewService({
      id: '',
      name: '',
      description: '',
      duration: '',
      price: '',
      available: true
    });
    setShowServiceForm(false);
  }

  function removeService(serviceId: string) {
    setData({
      ...data,
      services: (data.services || []).filter(s => s.id !== serviceId)
    });
  }

  function updateService(serviceId: string, updates: Partial<Service>) {
    setData({
      ...data,
      services: (data.services || []).map(s =>
        s.id === serviceId ? { ...s, ...updates } : s
      )
    });
  }

  function updateSocialLink(platform: string, value: string) {
    setData({
      ...data,
      social_links: {
        ...data.social_links,
        [platform]: value
      }
    });
  }

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {message && (
        <div className={`p-3 rounded-lg mb-4 ${
          message.includes('Error') 
            ? 'bg-red-100 text-red-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      {/* Basic Information Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        
        {/* Logo Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Business Logo</label>
          <LogoUploader
            businessId={businessId}
            value={data.logo_url}
            onChange={(url) => setData({ ...data, logo_url: url })}
          />
        </div>

        {/* Cover Image Upload with Position Control */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
          <CoverPhotoUploader
            businessId={businessId}
            value={data.cover_url}
            onChange={(url) => setData({ ...data, cover_url: url })}
          />
        </div>

        {/* Name and Handle - PRESERVED AS IS */}
        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name *
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={data.display_name}
              onChange={(e) => setData({ ...data, display_name: e.target.value })}
              placeholder="Your Business Name"
              style={{ fontSize: '16px', minHeight: '44px' }}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Handle *
            </label>
            <div className="flex items-center">
              <span className="text-gray-500 mr-1">@</span>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={data.handle}
                onChange={(e) => setData({ ...data, handle: e.target.value.replace(/[^a-z0-9_]/gi, '') })}
                placeholder="yourbusiness"
                style={{ fontSize: '16px', minHeight: '44px' }}
              />
            </div>
          </div>
        </div>

        {/* Tagline - PRESERVED AS IS */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Tagline</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={data.tagline}
            onChange={(e) => setData({ ...data, tagline: e.target.value })}
            placeholder="Your inspiring tagline"
            maxLength={100}
            style={{ fontSize: '16px', minHeight: '44px' }}
          />
        </div>

        {/* Bio - PRESERVED AS IS */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            rows={4}
            value={data.bio}
            onChange={(e) => setData({ ...data, bio: e.target.value })}
            placeholder="Tell customers about your business..."
            style={{ fontSize: '16px' }}
          />
        </div>
      </div>

      {/* NEW Services Section */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200 shadow-md">
        <h3 className="text-xl font-bold text-amber-900 mb-6 flex items-center gap-2">
          <span className="text-2xl">🛠️</span> Services Offered
        </h3>
        
        {/* Display existing services */}
        <div className="space-y-3 mb-4">
          {(data.services || []).map((service) => (
            <div key={service.id} className="bg-white rounded-xl p-4 border border-amber-200">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-900">{service.name}</h4>
                  {service.description && (
                    <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs">
                    {service.duration && (
                      <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded">
                        ⏱️ {service.duration}
                      </span>
                    )}
                    {service.price && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                        💰 {service.price}
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded ${
                      service.available 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {service.available ? '✅ Available' : '❌ Unavailable'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeService(service.id)}
                  className="text-red-500 hover:text-red-700 p-2"
                  title="Remove service"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add new service form */}
        {showServiceForm ? (
          <div className="bg-white rounded-xl p-4 border-2 border-amber-300">
            <h4 className="font-semibold text-amber-900 mb-3">Add New Service</h4>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Service name (e.g., Singing Bowls Session)"
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                style={{ fontSize: '16px', minHeight: '44px' }}
              />
              <textarea
                placeholder="Description (optional)"
                value={newService.description}
                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={2}
                style={{ fontSize: '16px' }}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Duration (e.g., 1 hour)"
                  value={newService.duration}
                  onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  style={{ fontSize: '16px', minHeight: '44px' }}
                />
                <input
                  type="text"
                  placeholder="Price (e.g., $50)"
                  value={newService.price}
                  onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  style={{ fontSize: '16px', minHeight: '44px' }}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={addService}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                  style={{ minHeight: '44px' }}
                >
                  Add Service
                </button>
                <button
                  onClick={() => {
                    setShowServiceForm(false);
                    setNewService({
                      id: '',
                      name: '',
                      description: '',
                      duration: '',
                      price: '',
                      available: true
                    });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  style={{ minHeight: '44px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowServiceForm(true)}
            className="w-full sm:w-auto px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium flex items-center justify-center gap-2"
            style={{ minHeight: '48px' }}
          >
            <span className="text-xl">+</span> Add Service
          </button>
        )}
        
        {(data.services || []).length === 0 && !showServiceForm && (
          <p className="text-sm text-amber-700 mt-2">
            Add your services to help customers understand what you offer
          </p>
        )}
      </div>

      {/* Amenities & Accessibility Box - PRESERVED EXACTLY */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 shadow-md">
        <h3 className="text-xl font-bold text-green-900 mb-6 flex items-center gap-2">
          <span className="text-2xl">✨</span> Amenities & Accessibility
        </h3>
        
        <div className="flex flex-wrap gap-3">
          {amenityOptions.map(amenity => (
            <button
              key={amenity}
              type="button"
              onClick={() => {
                const amens = data.amenities || [];
                if (amens.includes(amenity)) {
                  setData({ ...data, amenities: amens.filter(a => a !== amenity) });
                } else {
                  setData({ ...data, amenities: [...amens, amenity] });
                }
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                data.amenities?.includes(amenity)
                  ? 'bg-green-600 text-white shadow-md transform scale-105'
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300'
              }`}
              style={{ minHeight: '36px' }}
            >
              {amenity}
            </button>
          ))}
        </div>
        <p className="text-xs text-green-700 mt-4">Select all that apply to help customers know what to expect</p>
      </div>

      {/* Contact Information Box - PRESERVED EXACTLY WITH MOBILE OPTIMIZATION */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-md">
        <h3 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
          <span className="text-2xl">📞</span> Contact Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-blue-800 mb-2">Phone Number</label>
            <input
              type="tel"
              value={data.phone || ''}
              onChange={(e) => setData({ ...data, phone: e.target.value })}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-white"
              placeholder="(555) 123-4567"
              style={{ fontSize: '16px', minHeight: '44px' }}
            />
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.phone_public}
                onChange={(e) => setData({ ...data, phone_public: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-blue-700">Display publicly</span>
            </label>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-blue-800 mb-2">Email Address</label>
            <input
              type="email"
              value={data.email || ''}
              onChange={(e) => setData({ ...data, email: e.target.value })}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-white"
              placeholder="hello@yourbusiness.com"
              style={{ fontSize: '16px', minHeight: '44px' }}
            />
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.email_public}
                onChange={(e) => setData({ ...data, email_public: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-blue-700">Display publicly</span>
            </label>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-semibold text-blue-800 mb-2">Website</label>
            <input
              type="url"
              value={data.website_url || ''}
              onChange={(e) => setData({ ...data, website_url: e.target.value })}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-white"
              placeholder="https://yourbusiness.com"
              style={{ fontSize: '16px', minHeight: '44px' }}
            />
          </div>

          {/* Booking URL */}
          <div>
            <label className="block text-sm font-semibold text-blue-800 mb-2">Booking/Calendar Link</label>
            <input
              type="url"
              value={data.booking_url || ''}
              onChange={(e) => setData({ ...data, booking_url: e.target.value })}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-white"
              placeholder="https://calendly.com/yourbusiness"
              style={{ fontSize: '16px', minHeight: '44px' }}
            />
          </div>

          {/* Location - PRESERVED EXACTLY */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-blue-800 mb-2">Location</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={data.location_text || ''}
                onChange={(e) => setData({ ...data, location_text: e.target.value })}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-white"
                placeholder="123 Main St"
                style={{ fontSize: '16px', minHeight: '44px' }}
              />
              <input
                type="text"
                value={data.location_city || ''}
                onChange={(e) => setData({ ...data, location_city: e.target.value })}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-white"
                placeholder="City"
                style={{ fontSize: '16px', minHeight: '44px' }}
              />
              <input
                type="text"
                value={data.location_state || ''}
                onChange={(e) => setData({ ...data, location_state: e.target.value })}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-white"
                placeholder="State"
                style={{ fontSize: '16px', minHeight: '44px' }}
              />
            </div>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.location_is_public}
                onChange={(e) => setData({ ...data, location_is_public: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-blue-700">Display location publicly</span>
            </label>
          </div>
        </div>
      </div>

      {/* Social Media Box - PRESERVED EXACTLY */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200 shadow-md">
        <h3 className="text-xl font-bold text-purple-900 mb-6 flex items-center gap-2">
          <span className="text-2xl">🔗</span> Social Media Links
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {socialPlatforms.map(platform => (
            <div key={platform.id} className="flex items-center gap-3">
              <span className="text-2xl">{platform.icon}</span>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-purple-800 mb-1">
                  {platform.label}
                </label>
                <input
                  type="url"
                  value={data.social_links?.[platform.id] || ''}
                  onChange={(e) => updateSocialLink(platform.id, e.target.value)}
                  className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg focus:ring-4 focus:ring-purple-200 focus:border-purple-500 bg-white"
                  placeholder={platform.placeholder}
                  style={{ fontSize: '16px', minHeight: '44px' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Business QR Code - PRESERVED */}
      <BusinessInviteQR 
        businessId={businessId}
        businessHandle={data.handle}
        businessName={data.display_name}
        mode="full"
        size={200}
      />

      {/* Save Button - PRESERVED WITH MOBILE OPTIMIZATION */}
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving || !data.display_name || !data.handle}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
          style={{ minHeight: '48px' }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
