// components/BusinessInfoEditor.tsx - ENHANCED VERSION WITH ALL FEATURES
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AvatarUploader from "@/components/AvatarUploader";

type Props = { userId: string | null };

interface BusinessHours {
  monday: { open: string; close: string; closed: boolean };
  tuesday: { open: string; close: string; closed: boolean };
  wednesday: { open: string; close: string; closed: boolean };
  thursday: { open: string; close: string; closed: boolean };
  friday: { open: string; close: string; closed: boolean };
  saturday: { open: string; close: string; closed: boolean };
  sunday: { open: string; close: string; closed: boolean };
}

interface SocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
  x?: string;
  whatsapp?: string;
}

interface GalleryItem {
  id: string;
  url: string;
  caption?: string;
  visibility: 'public' | 'unlisted' | 'private';
}

export default function BusinessInfoEditor({ userId }: Props) {
  const [activeTab, setActiveTab] = useState<'basic' | 'contact' | 'hours' | 'social' | 'gallery' | 'settings'>('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Basic Info
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState("$$");
  const [languages, setLanguages] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);

  // Contact & Location
  const [locationText, setLocationText] = useState("");
  const [locationPublic, setLocationPublic] = useState(false);
  const [phone, setPhone] = useState("");
  const [phonePublic, setPhonePublic] = useState(false);
  const [email, setEmail] = useState("");
  const [emailPublic, setEmailPublic] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");

  // Hours
  const [hours, setHours] = useState<BusinessHours>({
    monday: { open: "09:00", close: "17:00", closed: false },
    tuesday: { open: "09:00", close: "17:00", closed: false },
    wednesday: { open: "09:00", close: "17:00", closed: false },
    thursday: { open: "09:00", close: "17:00", closed: false },
    friday: { open: "09:00", close: "17:00", closed: false },
    saturday: { open: "10:00", close: "14:00", closed: false },
    sunday: { open: "10:00", close: "14:00", closed: true },
  });

  // Social Links
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});

  // Gallery
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  // Settings
  const [visibility, setVisibility] = useState<'public' | 'private' | 'unlisted'>('public');
  const [discoverable, setDiscoverable] = useState(true);
  const [allowMessages, setAllowMessages] = useState(true);
  const [allowReviews, setAllowReviews] = useState(true);
  const [allowCollaboration, setAllowCollaboration] = useState(false);

  // Predefined options
  const categoryOptions = [
    'Healing', 'Wellness', 'Spiritual', 'Yoga', 'Meditation',
    'Therapy', 'Fitness', 'Nutrition', 'Massage', 'Energy Work'
  ];

  const languageOptions = [
    'English', 'Spanish', 'French', 'German', 'Italian',
    'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Arabic'
  ];

  const amenityOptions = [
    'Parking', 'WiFi', 'Wheelchair Access', 'Restrooms', 'Changing Rooms',
    'Shower Facilities', 'Lockers', 'Air Conditioning', 'Heating', 'Outdoor Space'
  ];

  useEffect(() => {
    loadBusinessData();
  }, [userId]);

  async function loadBusinessData() {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (error) throw error;
      
      // Load all fields
      setHandle(data.business_handle || '');
      setName(data.business_name || '');
      setTagline(data.business_tagline || '');
      setDescription(data.business_bio || '');
      setLogoUrl(data.business_logo_url || '');
      setCoverUrl(data.business_cover_url || '');
      setCategories(data.business_categories || []);
      setPriceRange(data.business_price_range || '$$');
      setLanguages(data.business_languages || []);
      setAmenities(data.business_amenities || []);
      
      setLocationText(data.business_location_text || '');
      setLocationPublic(data.business_location_is_public || false);
      setPhone(data.business_phone || '');
      setPhonePublic(data.business_phone_public || false);
      setEmail(data.business_email || '');
      setEmailPublic(data.business_email_public || false);
      setWebsiteUrl(data.business_website_url || '');
      setBookingUrl(data.business_booking_url || '');
      
      setHours(data.business_hours || hours);
      setSocialLinks(data.business_social_links || {});
      setGallery(data.business_gallery || []);
      
      setVisibility(data.business_visibility || 'public');
      setDiscoverable(data.business_discoverable !== false);
      setAllowMessages(data.business_allow_messages !== false);
      setAllowReviews(data.business_allow_reviews !== false);
      setAllowCollaboration(data.business_allow_collaboration || false);
      
    } catch (e: any) {
      setError(e.message || "Could not load business data");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!userId) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const updates = {
        business_handle: handle.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        business_name: name.trim(),
        business_tagline: tagline.trim(),
        business_bio: description.trim(),
        business_logo_url: logoUrl,
        business_cover_url: coverUrl,
        business_categories: categories,
        business_price_range: priceRange,
        business_languages: languages,
        business_amenities: amenities,
        business_location_text: locationText,
        business_location_is_public: locationPublic,
        business_phone: phone,
        business_phone_public: phonePublic,
        business_email: email,
        business_email_public: emailPublic,
        business_website_url: websiteUrl,
        business_booking_url: bookingUrl,
        business_hours: hours,
        business_social_links: socialLinks,
        business_gallery: gallery,
        business_visibility: visibility,
        business_discoverable: discoverable,
        business_allow_messages: allowMessages,
        business_allow_reviews: allowReviews,
        business_allow_collaboration: allowCollaboration,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);
      
      if (error) throw error;
      
      setSuccess("Business profile saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (e: any) {
      setError(e.message || "Could not save business details");
    } finally {
      setSaving(false);
    }
  }

  function updateHours(day: keyof BusinessHours, field: 'open' | 'close' | 'closed', value: any) {
    setHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  }

  function addGalleryItem(url: string) {
    const newItem: GalleryItem = {
      id: Date.now().toString(),
      url,
      visibility: 'public'
    };
    setGallery([...gallery, newItem]);
  }

  function updateGalleryItem(id: string, updates: Partial<GalleryItem>) {
    setGallery(gallery.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  }

  function removeGalleryItem(id: string) {
    setGallery(gallery.filter(item => item.id !== id));
  }

  function isOpenNow(): boolean {
    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[now.getDay()] as keyof BusinessHours;
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const todayHours = hours[currentDay];
    if (todayHours.closed) return false;
    
    const openTime = parseInt(todayHours.open.replace(':', ''));
    const closeTime = parseInt(todayHours.close.replace(':', ''));
    
    return currentTime >= openTime && currentTime <= closeTime;
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <section className="card p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Business Profile Editor</h2>
        <div className="flex items-center gap-3">
          {isOpenNow() && (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              Open Now
            </span>
          )}
          <button
            onClick={save}
            disabled={saving || !name || !handle}
            className="btn btn-brand"
          >
            {saving ? "Saving..." : "Save All Changes"}
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 border-b">
        {[
          { id: 'basic', label: 'Basic Info' },
          { id: 'contact', label: 'Contact & Location' },
          { id: 'hours', label: 'Hours' },
          { id: 'social', label: 'Social & Links' },
          { id: 'gallery', label: 'Gallery' },
          { id: 'settings', label: 'Settings' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <>
            {/* Handle */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Business Handle <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                <span className="px-3 py-2 bg-gray-100 rounded-l-lg">@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="tree-of-life"
                  className="flex-1 px-3 py-2 border rounded-r-lg"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Your unique URL: /business/{handle || 'your-handle'}
              </p>
            </div>

            {/* Name & Tagline */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="The Beautiful Healer"
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tagline (80 chars)
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value.slice(0, 80))}
                  placeholder="Holistic healing for mind, body & soul"
                  className="w-full px-3 py-2 border rounded-lg"
                  maxLength={80}
                />
                <p className="text-xs text-gray-500 mt-1">{tagline.length}/80</p>
              </div>
            </div>

            {/* Logos */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Logo</label>
                <AvatarUploader
                  userId={userId}
                  value={logoUrl}
                  onChange={setLogoUrl}
                  label="Upload Logo"
                  size={120}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Cover Image</label>
                <AvatarUploader
                  userId={userId}
                  value={coverUrl}
                  onChange={setCoverUrl}
                  label="Upload Cover"
                  size={120}
                />
                <p className="text-xs text-gray-500 mt-1">Recommended: 1920x400px</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">
                About Your Business
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell customers about your business, services, and what makes you unique..."
                rows={6}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium mb-2">Categories</label>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      if (categories.includes(cat)) {
                        setCategories(categories.filter(c => c !== cat));
                      } else {
                        setCategories([...categories, cat]);
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-sm ${
                      categories.includes(cat)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium mb-2">Price Range</label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="$">$ - Budget</option>
                <option value="$$">$$ - Moderate</option>
                <option value="$$$">$$$ - Premium</option>
                <option value="$$$$">$$$$ - Luxury</option>
              </select>
            </div>

            {/* Languages */}
            <div>
              <label className="block text-sm font-medium mb-2">Languages</label>
              <div className="flex flex-wrap gap-2">
                {languageOptions.map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => {
                      if (languages.includes(lang)) {
                        setLanguages(languages.filter(l => l !== lang));
                      } else {
                        setLanguages([...languages, lang]);
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-sm ${
                      languages.includes(lang)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Amenities & Accessibility
              </label>
              <div className="flex flex-wrap gap-2">
                {amenityOptions.map(amenity => (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => {
                      if (amenities.includes(amenity)) {
                        setAmenities(amenities.filter(a => a !== amenity));
                      } else {
                        setAmenities([...amenities, amenity]);
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-sm ${
                      amenities.includes(amenity)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {amenity}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Contact & Location Tab */}
        {activeTab === 'contact' && (
          <>
            {/* Location */}
            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <input
                type="text"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="City, State, Country"
                className="w-full px-3 py-2 border rounded-lg"
              />
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={locationPublic}
                  onChange={(e) => setLocationPublic(e.target.checked)}
                />
                <span className="text-sm">Show location publicly</span>
              </label>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-2">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 border rounded-lg"
              />
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={phonePublic}
                  onChange={(e) => setPhonePublic(e.target.checked)}
                />
                <span className="text-sm">Show phone publicly</span>
              </label>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@business.com"
                className="w-full px-3 py-2 border rounded-lg"
              />
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={emailPublic}
                  onChange={(e) => setEmailPublic(e.target.checked)}
                />
                <span className="text-sm">Show email publicly</span>
              </label>
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium mb-2">Website URL</label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://www.yourbusiness.com"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            {/* Booking URL */}
            <div>
              <label className="block text-sm font-medium mb-2">Booking URL</label>
              <input
                type="url"
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                placeholder="https://calendly.com/yourbusiness"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </>
        )}

        {/* Hours Tab */}
        {activeTab === 'hours' && (
          <div className="space-y-3">
            <h3 className="font-semibold mb-3">Business Hours</h3>
            {Object.entries(hours).map(([day, dayHours]) => (
              <div key={day} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-28 font-medium capitalize">{day}</div>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!dayHours.closed}
                    onChange={(e) => updateHours(day as keyof BusinessHours, 'closed', !e.target.checked)}
                  />
                  <span className="text-sm">Open</span>
                </label>
                
                {!dayHours.closed && (
                  <>
                    <input
                      type="time"
                      value={dayHours.open}
                      onChange={(e) => updateHours(day as keyof BusinessHours, 'open', e.target.value)}
                      className="px-2 py-1 border rounded"
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={dayHours.close}
                      onChange={(e) => updateHours(day as keyof BusinessHours, 'close', e.target.value)}
                      className="px-2 py-1 border rounded"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Social Links Tab */}
        {activeTab === 'social' && (
          <div className="space-y-4">
            <h3 className="font-semibold mb-3">Social Media Links</h3>
            
            {['instagram', 'facebook', 'tiktok', 'youtube', 'linkedin', 'x', 'whatsapp'].map(platform => (
              <div key={platform}>
                <label className="block text-sm font-medium mb-2 capitalize">
                  {platform === 'x' ? 'X (Twitter)' : platform}
                </label>
                <input
                  type="text"
                  value={socialLinks[platform as keyof SocialLinks] || ''}
                  onChange={(e) => setSocialLinks({ ...socialLinks, [platform]: e.target.value })}
                  placeholder={`@yourbusiness or URL`}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            ))}
          </div>
        )}

        {/* Gallery Tab */}
        {activeTab === 'gallery' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Gallery</h3>
              <span className="text-sm text-gray-500">{gallery.length} items</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {gallery.map(item => (
                <div key={item.id} className="relative group">
                  <img
                    src={item.url}
                    alt={item.caption || 'Gallery image'}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  <select
                    value={item.visibility}
                    onChange={(e) => updateGalleryItem(item.id, { 
                      visibility: e.target.value as 'public' | 'unlisted' | 'private' 
                    })}
                    className="absolute bottom-2 left-2 text-xs px-2 py-1 bg-white/90 rounded"
                  >
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="private">Private</option>
                  </select>
                  <button
                    onClick={() => removeGalleryItem(item.id)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
              
              <button
                onClick={() => {
                  // In production, this would open an upload dialog
                  const url = prompt('Enter image URL:');
                  if (url) addGalleryItem(url);
                }}
                className="aspect-square border-2 border-dashed rounded-lg flex items-center justify-center hover:bg-gray-50 cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">+</div>
                  <div className="text-sm text-gray-500">Add Photo</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h3 className="font-semibold mb-3">Visibility & Privacy Settings</h3>
            
            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium mb-2">Profile Visibility</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="public">Public - Anyone can view</option>
                <option value="unlisted">Unlisted - Only with direct link</option>
                <option value="private">Private - Only you can view</option>
              </select>
            </div>

            {/* Toggle Settings */}
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">Discoverable</div>
                  <div className="text-sm text-gray-500">Show in search results and feeds</div>
                </div>
                <input
                  type="checkbox"
                  checked={discoverable}
                  onChange={(e) => setDiscoverable(e.target.checked)}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">Allow Messages</div>
                  <div className="text-sm text-gray-500">Let customers message you</div>
                </div>
                <input
                  type="checkbox"
                  checked={allowMessages}
                  onChange={(e) => setAllowMessages(e.target.checked)}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">Allow Reviews</div>
                  <div className="text-sm text-gray-500">Let customers leave reviews</div>
                </div>
                <input
                  type="checkbox"
                  checked={allowReviews}
                  onChange={(e) => setAllowReviews(e.target.checked)}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">Allow Collaboration</div>
                  <div className="text-sm text-gray-500">Let team members edit profile</div>
                </div>
                <input
                  type="checkbox"
                  checked={allowCollaboration}
                  onChange={(e) => setAllowCollaboration(e.target.checked)}
                  className="w-5 h-5"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
