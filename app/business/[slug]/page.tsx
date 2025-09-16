// app/business/[slug]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

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
}

export default function BusinessPublicPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
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
          setBusiness(data);
        }
      } catch (err: any) {
        console.error('Error loading business:', err);
        setError(err.message || 'Failed to load business profile');
      } finally {
        setLoading(false);
      }
    }
    
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Business Not Found</h1>
          <p className="text-gray-600">{error || 'This business profile doesn\'t exist or is not public.'}</p>
        </div>
      </div>
    );
  }

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-16 relative">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-start gap-4">
            {business.logo_url ? (
              <img 
                src={business.logo_url} 
                alt={business.display_name}
                className="w-24 h-24 rounded-lg object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center">
                <span className="text-3xl">🏢</span>
              </div>
            )}
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{business.display_name}</h1>
              {business.tagline && (
                <p className="text-gray-600 mt-1">{business.tagline}</p>
              )}
              <p className="text-sm text-gray-500 mt-2">@{business.handle}</p>
            </div>
          </div>

          {business.bio && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2">About</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{business.bio}</p>
            </div>
          )}

          {/* Contact Info */}
          <div className="mt-6 space-y-2">
            {business.phone_public && business.phone && (
              <div className="flex items-center gap-2">
                <span>📞</span>
                <a href={`tel:${business.phone}`} className="text-blue-600 hover:underline">
                  {business.phone}
                </a>
              </div>
            )}
            
            {business.email_public && business.email && (
              <div className="flex items-center gap-2">
                <span>✉️</span>
                <a href={`mailto:${business.email}`} className="text-blue-600 hover:underline">
                  {business.email}
                </a>
              </div>
            )}
            
            {business.website_url && (
              <div className="flex items-center gap-2">
                <span>🌐</span>
                <a 
                  href={business.website_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Website
                </a>
              </div>
            )}
          </div>

          {/* Services */}
          {business.services && business.services.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-3">Services</h2>
              <div className="space-y-3">
                {business.services.map((service: any, index: number) => (
                  <div key={service.id || index} className="border-l-4 border-purple-400 pl-4">
                    <h3 className="font-medium">{service.title}</h3>
                    {service.description && (
                      <p className="text-gray-600 text-sm mt-1">{service.description}</p>
                    )}
                    {service.price && (
                      <p className="text-purple-600 font-medium mt-1">{service.price}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
