// app/business/[slug]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import BusinessFollowButton from '@/components/business/BusinessFollowButton';
import BusinessVerificationBadge from '@/components/business/BusinessVerificationBadge';
import BusinessViewerTutorial from '@/components/BusinessViewerTutorial';
import ReportButton from '@/components/ReportButton';
import ShareButton from '@/components/ShareButton';
import { getVerificationLevel } from '@/components/business/BusinessVerificationBadge';

interface BusinessProfile {
  id: string;
  display_name: string;
  handle: string;
  tagline?: string;
  bio?: string;
  logo_url?: string;
  cover_url?: string;
  categories?: string[];
  phone?: string;
  phone_public?: boolean;
  email?: string;
  email_public?: boolean;
  website_url?: string;
  hours?: any;
  services?: any[];
  gallery?: any[];
  social_links?: Record<string, string> | null;
  visibility?: 'public' | 'private' | 'unlisted';
  verified?: boolean;
  follower_count?: number;
  verification_level?: 'none' | 'some' | 'verified';
}

interface BusinessEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  image_path?: string;
}

export default function BusinessPublicPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [events, setEvents] = useState<BusinessEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('about');
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    loadBusinessData();
  }, [slug]);

  async function loadBusinessData() {
    try {
      console.log('🔍 Loading business data for slug:', slug);
      setLoading(true);
      
      // Remove @ symbol if present
      const cleanSlug = slug?.replace('@', '');

      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('handle', cleanSlug)
        .eq('visibility', 'public')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Business profile not found or not public');
        } else {
          throw error;
        }
      } else {
        console.log('✅ Business data loaded:', data.display_name);
        setBusiness(data);
        loadBusinessEvents(data.id);
      }
    } catch (err: any) {
      console.error('❌ Error loading business:', err);
      setError(err.message || 'Failed to load business profile');
    } finally {
      setLoading(false);
    }
  }

  async function loadBusinessEvents(businessId: string) {
    setEventsLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('host_business_id', businessId)
        .eq('status', 'scheduled')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(10);

      if (!error && data) {
        setEvents(data);
      }
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setEventsLoading(false);
    }
  }

  function handleFollowChanged() {
    console.log('🔄 Follow status changed, reloading business data...');
    // Reload the business data to get updated follower count
    loadBusinessData();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <div className="text-lg text-gray-600">Loading business...</div>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🏢</div>
          <h1 className="text-2xl font-bold mb-2">Business Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'This business profile doesn\'t exist or is not public.'}</p>
          <a 
            href="/explore" 
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Discover Businesses
          </a>
        </div>
      </div>
    );
  }

  // Calculate verification level if not set
  const verificationLevel = business.verification_level || getVerificationLevel(business.follower_count || 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-64 bg-gradient-to-br from-purple-400 to-pink-300">
        {business.cover_url && (
          <img 
            src={business.cover_url} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Business Info */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-16 relative">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            {business.logo_url ? (
              <img 
                src={business.logo_url} 
                alt={business.display_name}
                className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                <span className="text-3xl">🏢</span>
              </div>
            )}
            
            <div className="flex-1 w-full">
              <div className="flex flex-col gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold">{business.display_name}</h1>
                    {business.verified && (
                      <span className="text-blue-500 text-xl" title="Verified Business">✓</span>
                    )}
                  </div>
                  
                  {business.tagline && (
                    <p className="text-gray-600 mt-1">{business.tagline}</p>
                  )}
                  
                  <p className="text-sm text-gray-500 mt-2">@{business.handle}</p>
                  
                  {/* Verification Badge */}
                  <div className="mt-3">
                    <BusinessVerificationBadge 
                      level={verificationLevel}
                      businessId={business.id}
                      followerCount={business.follower_count}
                      size="medium"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  {/* Follow Button */}
                  <div className="flex-1">
                    <BusinessFollowButton
                      businessId={business.id}
                      businessName={business.display_name}
                      size="medium"
                      variant="primary"
                      showCount={true}
                      className="w-full"
                      onFollowChanged={handleFollowChanged}
                    />
                  </div>
                  
                  {/* Share and Report Buttons */}
                  <div className="flex gap-2 sm:flex-shrink-0">
                    <ShareButton
                      title={business.display_name}
                      text={business.tagline}
                      size="medium"
                      variant="both"
                    />
                    <ReportButton
                      contentType="business"
                      contentId={business.id}
                      contentName={business.display_name}
                      size="medium"
                      variant="both"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="border-b overflow-x-auto">
            <nav className="flex space-x-8 px-6 min-w-max">
              {[
                { id: 'about', label: 'About', icon: '📋' },
                { id: 'services', label: 'Services', icon: '💎' },
                { id: 'events', label: 'Events', icon: '📅' },
                { id: 'gallery', label: 'Gallery', icon: '📸' },
                { id: 'contact', label: 'Contact', icon: '📞' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                {business.bio && (
                  <div>
                    <h2 className="text-lg font-semibold mb-3">About</h2>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{business.bio}</p>
                  </div>
                )}

                {business.categories && business.categories.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-3">Categories</h2>
                    <div className="flex flex-wrap gap-2">
                      {business.categories.map((category, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {business.hours && (
                  <div>
                    <h2 className="text-lg font-semibold mb-3">Hours</h2>
                    <div className="space-y-1">
                      {Object.entries(business.hours).map(([day, hours]: [string, any]) => (
                        <div key={day} className="flex justify-between">
                          <span className="capitalize font-medium">{day}</span>
                          <span className="text-gray-600">
                            {hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Services Tab */}
            {activeTab === 'services' && (
              <div>
                <h2 className="text-lg font-semibold mb-6">Services & Offerings</h2>
                {business.services && business.services.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    {business.services.map((service: any, index: number) => (
                      <div key={service.id || index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <h3 className="font-semibold text-lg mb-2">{service.title || service.name}</h3>
                        {service.description && (
                          <p className="text-gray-600 mb-3">{service.description}</p>
                        )}
                        <div className="flex justify-between items-center">
                          {service.price && (
                            <span className="text-purple-600 font-semibold">{service.price}</span>
                          )}
                          {service.duration && (
                            <span className="text-gray-500 text-sm">{service.duration}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <span className="text-4xl mb-4 block">💎</span>
                    <p>No services listed yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* Events Tab */}
            {activeTab === 'events' && (
              <div>
                <h2 className="text-lg font-semibold mb-6">Upcoming Events</h2>
                {eventsLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <p className="mt-2 text-gray-500">Loading events...</p>
                  </div>
                ) : events.length > 0 ? (
                  <div className="space-y-4">
                    {events.map((event) => (
                      <div key={event.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
                            {event.description && (
                              <p className="text-gray-600 mb-3">{event.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                              <span>📅 {new Date(event.start_time).toLocaleDateString()}</span>
                              <span>🕐 {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {event.location && <span>📍 {event.location}</span>}
                            </div>
                          </div>
                          {event.image_path && (
                            <img 
                              src={event.image_path} 
                              alt={event.title}
                              className="w-20 h-20 rounded-lg object-cover ml-4 flex-shrink-0"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <span className="text-4xl mb-4 block">📅</span>
                    <p>No upcoming events.</p>
                  </div>
                )}
              </div>
            )}

            {/* Gallery Tab */}
            {activeTab === 'gallery' && (
              <div>
                <h2 className="text-lg font-semibold mb-6">Gallery</h2>
                {business.gallery && business.gallery.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {business.gallery.map((item: any, index: number) => (
                      <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img 
                          src={item.url || item.image_url} 
                          alt={item.alt || `Gallery image ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <span className="text-4xl mb-4 block">📸</span>
                    <p>No gallery images yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* Contact Tab */}
            {activeTab === 'contact' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold mb-6">Contact Information</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {business.phone_public && business.phone && (
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📞</span>
                        <div>
                          <p className="font-medium">Phone</p>
                          <a href={`tel:${business.phone}`} className="text-blue-600 hover:underline">
                            {business.phone}
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {business.email_public && business.email && (
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">✉️</span>
                        <div>
                          <p className="font-medium">Email</p>
                          <a href={`mailto:${business.email}`} className="text-blue-600 hover:underline">
                            {business.email}
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {business.website_url && (
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🌐</span>
                        <div>
                          <p className="font-medium">Website</p>
                          <a 
                            href={business.website_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Visit Website
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {business.social_links && Object.keys(business.social_links).length > 0 && (
                    <div>
                      <h3 className="font-medium mb-3">Social Media</h3>
                      <div className="space-y-2">
                        {Object.entries(business.social_links).map(([platform, url]) => (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 hover:underline"
                          >
                            <span className="capitalize">{platform}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Business Viewer Tutorial */}
      <BusinessViewerTutorial />
    </div>
  );
}
