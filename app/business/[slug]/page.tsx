// app/business/[slug]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface BusinessProfile {
  owner_id: string;
  display_name: string;
  handle: string;
  tagline?: string;
  bio?: string;
  description?: string;
  logo_url?: string;
  cover_url?: string;
  categories?: string[];
  tags?: string[];
  price_range?: string;
  languages?: string[];
  amenities?: string[];
  accessibility_features?: string[];

  phone?: string;
  phone_public?: boolean;
  email?: string;
  email_public?: boolean;
  website_url?: string;
  booking_url?: string;

  address?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  location_text?: string;
  location_is_public?: boolean;

  hours?: any;
  special_hours?: any;
  services?: any;
  gallery?: any;
  featured_items?: any;
  social_links?: Record<string, string> | null;

  rating_average?: number;
  rating_count?: number;
  view_count?: number;
  follower_count?: number;
  
  allow_messages?: boolean;
  allow_reviews?: boolean;
  allow_collaboration?: boolean;
  discoverable?: boolean;
  verified?: boolean;
  verification_docs?: any;

  visibility?: string;
  created_at?: string;
  updated_at?: string;
}

export default function BusinessPublicPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('about');
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    async function load() {
      if (!slug) {
        setError('No business handle provided');
        setLoading(false);
        return;
      }

      const cleanSlug = slug.replace('@', '').toLowerCase();
      
      console.log('Looking for business with handle:', cleanSlug);

      const { data, error: fetchError } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('handle', cleanSlug)
        .eq('visibility', 'public')
        .single();

      if (fetchError) {
        console.error('Error loading business:', fetchError);
        if (fetchError.code === 'PGRST116') {
          setError('Business not found or not public');
        } else {
          setError(`Error: ${fetchError.message}`);
        }
      }

      if (data) {
        console.log('Found business:', data);
        setBusiness(data);
        
        // Check if open
        checkIfOpen(data.hours);

        // Update view count (using owner_id since no id column)
        try {
          await supabase
            .from('business_profiles')
            .update({ 
              view_count: (data.view_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('owner_id', data.owner_id);
        } catch (e) {
          console.warn('View count update failed', e);
        }
      } else if (!fetchError) {
        setError('Business profile not found');
      }
      
      setLoading(false);
    }
    
    load();
  }, [slug]);

  function checkIfOpen(hours: any) {
    if (!hours || typeof hours !== 'object') return;
    
    const now = new Date();
    const dayIndex = now.getDay();
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const day = dayKeys[dayIndex];

    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${hh}:${mm}`;

    const today = hours[day];
    if (today && !today.closed && today.open && today.close) {
      setIsOpen(currentTime >= today.open && currentTime <= today.close);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading business profile...</p>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-4">
            <div className="text-6xl">🏢</div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Business Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This business profile doesn\'t exist or is not public.'}</p>
          
          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-sm text-gray-500 bg-gray-100 p-4 rounded-lg text-left">
              <p className="font-semibold mb-2">Debug Info:</p>
              <p>URL Slug: {slug}</p>
              <p>Clean Slug: {slug?.replace('@', '').toLowerCase()}</p>
              <p>Query: handle="{slug?.replace('@', '').toLowerCase()}" AND visibility="public"</p>
            </div>
          )}
          
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section - Mobile Optimized */}
      <div className="relative">
        {business.cover_url ? (
          <img
            src={business.cover_url}
            alt="Cover"
            className="w-full h-32 sm:h-48 md:h-64 lg:h-80 object-cover"
          />
        ) : (
          <div className="w-full h-32 sm:h-48 md:h-64 lg:h-80 bg-gradient-to-br from-purple-400 via-purple-500 to-pink-500" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Logo + Name Overlay - Mobile Responsive */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end gap-3 sm:gap-4">
              {business.logo_url ? (
                <img
                  src={business.logo_url}
                  alt={business.display_name}
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg border-3 sm:border-4 border-white shadow-lg object-cover bg-white"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg border-3 sm:border-4 border-white shadow-lg bg-white flex items-center justify-center">
                  <span className="text-2xl sm:text-3xl">🏢</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-2 flex-wrap">
                  <span className="truncate">{business.display_name || 'Unnamed Business'}</span>
                  {business.verified && (
                    <span className="text-blue-400 text-lg sm:text-xl" title="Verified Business">✓</span>
                  )}
                </h1>
                {business.tagline && (
                  <p className="text-sm sm:text-base text-white/90 line-clamp-2">{business.tagline}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar - Mobile Optimized */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {business.phone_public && business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="flex-shrink-0 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg text-center hover:bg-purple-700 text-sm sm:text-base font-medium transition-colors"
              >
                <span className="inline sm:hidden">📞</span>
                <span className="hidden sm:inline">📞 Call</span>
              </a>
            )}
            {business.allow_messages && (
              <button className="flex-shrink-0 px-3 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm sm:text-base font-medium transition-colors">
                <span className="inline sm:hidden">💬</span>
                <span className="hidden sm:inline">💬 Message</span>
              </button>
            )}
            {business.booking_url && (
              <a
                href={business.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg text-center hover:bg-green-700 text-sm sm:text-base font-medium transition-colors"
              >
                <span className="inline sm:hidden">📅</span>
                <span className="hidden sm:inline">📅 Book</span>
              </a>
            )}
            {business.website_url && (
              <a
                href={business.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-center hover:bg-gray-50 text-sm sm:text-base font-medium transition-colors"
              >
                <span className="inline sm:hidden">🌐</span>
                <span className="hidden sm:inline">🌐 Website</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      {isMobile && (
        <div className="bg-white border-b px-3 py-2">
          <div className="flex gap-2 overflow-x-auto">
            {['about', 'services', 'gallery', 'reviews'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
                  ${activeTab === tab 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-600'}
                `}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content - Responsive Grid */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            
            {/* About Section */}
            {(activeTab === 'about' || !isMobile) && business.bio && (
              <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-3">About</h2>
                <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base">{business.bio}</p>
              </div>
            )}

            {/* Services */}
            {(activeTab === 'services' || !isMobile) && business.services && Array.isArray(business.services) && business.services.length > 0 && (
              <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Services</h2>
                <div className="grid gap-3 sm:gap-4">
                  {business.services.map((service: any, index: number) => (
                    <div key={service.id || index} className="border rounded-lg p-3 sm:p-4">
                      <div className="flex gap-3 sm:gap-4">
                        {service.image_url && (
                          <img
                            src={service.image_url}
                            alt={service.title}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base">{service.title}</h3>
                          {service.description && (
                            <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{service.description}</p>
                          )}
                          <div className="flex gap-3 sm:gap-4 mt-2 text-xs sm:text-sm">
                            {service.price && (
                              <span className="text-purple-600 font-medium">{service.price}</span>
                            )}
                            {service.duration && (
                              <span className="text-gray-500">{service.duration}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {(activeTab === 'gallery' || !isMobile) && business.gallery && Array.isArray(business.gallery) && business.gallery.length > 0 && (
              <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Gallery</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {business.gallery
                    .filter((item: any) => !item.visibility || item.visibility === 'public')
                    .map((item: any, index: number) => (
                      <div key={item.id || index} className="relative aspect-square">
                        <img
                          src={item.url}
                          alt={item.alt || `Gallery image ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Reviews - Mobile Tab */}
            {(activeTab === 'reviews' && isMobile) && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Reviews</h2>
                {business.rating_average ? (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl font-bold">{business.rating_average}</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={star <= Math.round(business.rating_average || 0) ? 'text-yellow-400' : 'text-gray-300'}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">({business.rating_count} reviews)</span>
                    </div>
                    {business.allow_reviews && (
                      <button className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                        Write a Review
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No reviews yet</p>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Sidebar (Desktop Only) */}
          {!isMobile && (
            <div className="space-y-4 sm:space-y-6">
              
              {/* Business Details */}
              <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm">
                <h3 className="font-semibold mb-4">Business Details</h3>

                {/* Open/Closed Status */}
                <div className="mb-4 text-center p-3 rounded-lg bg-gray-50">
                  <span className={`font-semibold ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
                    {isOpen ? '✅ Open Now' : '❌ Closed'}
                  </span>
                </div>

                {/* Location */}
                {business.location_is_public && (business.city || business.location_text || business.address) && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-1">Location</h4>
                    <div className="text-gray-900 space-y-1 text-sm">
                      {business.location_text && <div>{business.location_text}</div>}
                      {business.address && <div>{business.address}</div>}
                      {(business.city || business.state) && (
                        <div>
                          {business.city}{business.city && business.state && ', '}{business.state}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Email */}
                {business.email_public && business.email && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-1">Email</h4>
                    <a href={`mailto:${business.email}`} className="text-purple-600 hover:underline text-sm">
                      {business.email}
                    </a>
                  </div>
                )}

                {/* Categories */}
                {business.categories && business.categories.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Categories</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {business.categories.map((cat) => (
                        <span
                          key={cat}
                          className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Links */}
                {business.social_links && Object.keys(business.social_links).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Connect</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(business.social_links).map(([platform, url]) => {
                        const safeUrl = (url || '').toString().trim();
                        if (!safeUrl) return null;
                        return (
                          <a
                            key={platform}
                            href={safeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-purple-100 transition-colors"
                            title={platform}
                          >
                            <span className="text-xs font-semibold">{platform.charAt(0).toUpperCase()}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Hours */}
              {business.hours && Object.keys(business.hours).length > 0 && (
                <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm">
                  <h3 className="font-semibold mb-4">Business Hours</h3>
                  <div className="space-y-2 text-sm">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                      const hours = business.hours[day];
                      if (!hours) return null;
                      return (
                        <div key={day} className="flex justify-between">
                          <span className="capitalize text-gray-600">{day}</span>
                          <span className="font-medium">
                            {hours.closed ? 'Closed' : `${hours.open || '—'} - ${hours.close || '—'}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {business.special_hours && Object.keys(business.special_hours).length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-600">Special hours may apply</p>
                    </div>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="bg-purple-50 rounded-lg p-4 sm:p-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  {business.view_count !== undefined && (
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{business.view_count}</div>
                      <div className="text-xs text-gray-600">Views</div>
                    </div>
                  )}
                  {business.follower_count !== undefined && (
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{business.follower_count}</div>
                      <div className="text-xs text-gray-600">Followers</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mobile Bottom Info */}
          {isMobile && (
            <div className="mt-6 space-y-4">
              {/* Business Info Card */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold mb-3">Business Info</h3>
                
                <div className="space-y-3 text-sm">
                  {/* Status */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className={`font-semibold ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
                      {isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>

                  {/* Phone */}
                  {business.phone_public && business.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone</span>
                      <a href={`tel:${business.phone}`} className="text-purple-600">
                        {business.phone}
                      </a>
                    </div>
                  )}

                  {/* Location */}
                  {business.location_is_public && (business.city || business.location_text) && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location</span>
                      <span className="text-right">
                        {business.city || business.location_text}
                      </span>
                    </div>
                  )}

                  {/* Rating */}
                  {business.rating_average && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rating</span>
                      <span>{business.rating_average}⭐ ({business.rating_count})</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
