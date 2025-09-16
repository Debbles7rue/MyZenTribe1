// app/business/[slug]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface BusinessProfile {
  id: string;
  display_name: string;
  handle: string;            // DB still stores this as 'handle'
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
  booking_url?: string;

  location_text?: string;
  location_city?: string;
  location_state?: string;
  location_is_public?: boolean;

  hours?: any;
  special_hours?: string;
  services?: any[];
  gallery?: any[];
  social_links?: Record<string, string> | null;

  rating_average?: number;
  rating_count?: number;
  allow_messages?: boolean;
  allow_reviews?: boolean;
  verified?: boolean;

  // optional:
  visibility?: 'public' | 'private' | 'unlisted';
  view_count?: number | null;
}

export default function BusinessPublicPage() {
  const params = useParams();
  const slug = params?.slug as string; // route param (was 'handle' before)
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const cleanSlug = slug?.replace('@', '');

      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('handle', cleanSlug)     // still look up by DB handle field
        .eq('visibility', 'public')
        .single();

      if (error) {
        console.warn('business load error:', error.message);
      }

      if (data) {
        setBusiness(data);

        // compute open/closed
        checkIfOpen(data.hours);

        // optimistic, simple view counter (ok for MVP)
        try {
          await supabase
            .from('business_profiles')
            .update({ view_count: (data.view_count || 0) + 1 })
            .eq('id', data.id);
        } catch (e) {
          console.warn('view_count update failed', e);
        }
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  function checkIfOpen(hours: any) {
    if (!hours) return;
    const now = new Date();
    const dayIndex = now.getDay(); // 0..6
    const dayKeys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const day = dayKeys[dayIndex];

    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${hh}:${mm}`;

    const today = hours[day];
    if (today && !today.closed && today.open && today.close) {
      setIsOpen(currentTime >= today.open && currentTime <= today.close);
    } else {
      setIsOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Business Not Found</h1>
          <p className="text-gray-600">This business profile doesn't exist or is not public.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="relative">
        {business.cover_url ? (
          <img
            src={business.cover_url}
            alt="Cover"
            className="w-full h-48 sm:h-64 lg:h-80 object-cover"
          />
        ) : (
          <div className="w-full h-48 sm:h-64 lg:h-80 bg-gradient-to-br from-purple-400 to-pink-300" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Logo + name */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <div className="max-w-6xl mx-auto flex items-end gap-4">
            {business.logo_url && (
              <img
                src={business.logo_url}
                alt={business.display_name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg border-4 border-white shadow-lg object-cover"
              />
            )}
            <div className="flex-1 text-white">
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                {business.display_name}
                {business.verified && <span className="text-blue-400">✓</span>}
              </h1>
              {business.tagline && (
                <p className="text-sm sm:text-base opacity-90">{business.tagline}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-wrap gap-2">
            {business.phone_public && business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 text-white rounded-lg text-center hover:bg-purple-700"
              >
                📞 Call
              </a>
            )}
            {business.allow_messages && (
              <button
                className="flex-1 sm:flex-none px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
              >
                💬 Message
              </button>
            )}
            {business.booking_url && (
              <a
                href={business.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg text-center hover:bg-green-700"
              >
                📅 Book
              </a>
            )}
            {business.website_url && (
              <a
                href={business.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg text-center hover:bg-gray-50"
              >
                🌐 Website
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            {business.bio && (
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-3">About</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{business.bio}</p>
              </div>
            )}

            {/* Services */}
            {business.services && business.services.length > 0 && (
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Services</h2>
                <div className="grid gap-4">
                  {business.services.map((service: any) => (
                    <div key={service.id ?? `${service.title}-${service.price}`} className="border rounded-lg p-4">
                      <div className="flex gap-4">
                        {service.image_url && (
                          <img
                            src={service.image_url}
                            alt={service.title}
                            className="w-20 h-20 rounded object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold">{service.title}</h3>
                          {service.description && (
                            <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                          )}
                          <div className="flex gap-4 mt-2">
                            {service.price && (
                              <span className="text-purple-600 font-medium">{service.price}</span>
                            )}
                            {service.duration && (
                              <span className="text-gray-500 text-sm">{service.duration}</span>
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
            {business.gallery && business.gallery.length > 0 && (
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Gallery</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {business.gallery
                    .filter((item: any) => !item.visibility || item.visibility === 'public')
                    .map((item: any) => (
                      <img
                        key={item.id ?? item.url}
                        src={item.url}
                        alt={item.alt || 'Gallery image'}
                        className="w-full h-32 sm:h-40 object-cover rounded-lg"
                      />
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Details */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold mb-4">Details</h3>

              {/* Status */}
              <div className="mb-4 text-center p-3 rounded-lg bg-green-50">
                <span className={`font-semibold ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
                  {isOpen ? '✅ Open Now' : '❌ Closed'}
                </span>
              </div>

              {/* Location */}
              {business.location_is_public && (business.location_city || business.location_text) && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Location</h4>
                  <div className="text-gray-900 space-y-1">
                    {business.location_text && <div>{business.location_text}</div>}
                    {business.location_city && business.location_state && (
                      <div>{business.location_city}, {business.location_state}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Email */}
              {business.email_public && business.email && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Email</h4>
                  <a href={`mailto:${business.email}`} className="text-purple-600 hover:underline">
                    {business.email}
                  </a>
                </div>
              )}

              {/* Categories */}
              {business.categories && business.categories.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {business.categories.map((cat) => (
                      <span
                        key={cat}
                        className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Links (fixed) */}
              {business.social_links && Object.keys(business.social_links || {}).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Connect</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(business.social_links).map(([platform, url]) => {
                      const safeUrl = (url || '').toString().trim();
                      if (!safeUrl) return null;
                      const label = platform.charAt(0).toUpperCase();
                      return (
                        <a
                          key={platform}
                          href={safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-purple-100"
                          aria-label={platform}
                          title={platform}
                        >
                          <span className="font-semibold">{label}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Hours */}
            {business.hours && (
              <div className="bg-white rounded-lg p-6">
                <h3 className="font-semibold mb-4">Hours</h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(business.hours).map(([day, hours]: [string, any]) => (
                    <div key={day} className="flex justify-between">
                      <span className="capitalize">{day}</span>
                      <span className="text-gray-600">
                        {hours?.closed ? 'Closed' : `${hours?.open ?? '--:--'} - ${hours?.close ?? '--:--'}`}
                      </span>
                    </div>
                  ))}
                </div>
                {business.special_hours && (
                  <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                    <p className="font-medium mb-1">Special Hours:</p>
                    <p className="whitespace-pre-wrap">{business.special_hours}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
