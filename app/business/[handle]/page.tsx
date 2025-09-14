// app/business/[handle]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import Link from "next/link";

// Types
interface BusinessProfile {
  id: string;
  handle: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  
  // Location
  location_text: string | null;
  location_is_public: boolean;
  
  // Contact
  phone_number: string | null;
  phone_public: boolean;
  email: string | null;
  email_public: boolean;
  website_url: string | null;
  booking_url: string | null;
  
  // Social
  social_links: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    youtube?: string;
    linkedin?: string;
    x?: string;
    whatsapp?: string;
  } | null;
  
  // Business details
  hours: BusinessHours | null;
  price_range: string | null;
  languages: string[] | null;
  amenities: string[] | null;
  
  // Stats
  rating_avg: number | null;
  rating_count: number | null;
  follower_count: number;
  
  // Gallery & Services
  gallery: GalleryItem[] | null;
  services: Service[] | null;
  
  // Meta
  verified: boolean;
  created_at: string;
  owner_id: string;
}

interface BusinessHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
  timezone?: string;
}

interface DayHours {
  open: string;
  close: string;
  closed?: boolean;
}

interface GalleryItem {
  id: string;
  url: string;
  caption?: string;
  type: 'image' | 'video';
}

interface Service {
  id: string;
  title: string;
  description: string;
  price?: string;
  duration?: string;
  image_url?: string;
}

export default function BusinessProfilePage() {
  const params = useParams();
  const handle = params.handle as string;
  
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showAllServices, setShowAllServices] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Check if business is open now
  const isOpenNow = () => {
    if (!business?.hours) return null;
    
    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[now.getDay()];
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const todayHours = business.hours[currentDay as keyof BusinessHours] as DayHours;
    if (!todayHours || todayHours.closed) return false;
    
    const openTime = parseInt(todayHours.open.replace(':', ''));
    const closeTime = parseInt(todayHours.close.replace(':', ''));
    
    return currentTime >= openTime && currentTime <= closeTime;
  };
  
  const getNextOpenTime = () => {
    if (!business?.hours) return null;
    const open = isOpenNow();
    if (open) {
      const now = new Date();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = days[now.getDay()];
      const todayHours = business.hours[currentDay as keyof BusinessHours] as DayHours;
      return `Closes at ${formatTime(todayHours.close)}`;
    }
    return "Closed now";
  };
  
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };
  
  useEffect(() => {
    loadBusinessProfile();
    checkCurrentUser();
  }, [handle]);
  
  async function loadBusinessProfile() {
    try {
      // For now, we'll load from the profiles table with business fields
      // In production, this would be a separate business_profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          business_services
        `)
        .eq('business_handle', handle)
        .single();
      
      if (error) throw error;
      
      // Transform the data to match our enhanced structure
      const profile: BusinessProfile = {
        id: data.id,
        handle: handle,
        name: data.business_name || 'Business Name',
        tagline: data.business_tagline || null,
        description: data.business_bio || null,
        logo_url: data.business_logo_url || null,
        cover_url: data.business_cover_url || '/default-cover.jpg',
        location_text: data.business_location_text,
        location_is_public: data.business_location_is_public || false,
        phone_number: data.business_phone,
        phone_public: data.business_phone_public || false,
        email: data.business_email,
        email_public: data.business_email_public || false,
        website_url: data.business_website_url,
        booking_url: data.business_booking_url,
        social_links: data.business_social_links || {},
        hours: data.business_hours || null,
        price_range: data.business_price_range,
        languages: data.business_languages || [],
        amenities: data.business_amenities || [],
        rating_avg: data.business_rating_avg || null,
        rating_count: data.business_rating_count || 0,
        follower_count: data.business_follower_count || 0,
        gallery: data.business_gallery || [],
        services: data.business_services || [],
        verified: data.business_verified || false,
        created_at: data.created_at,
        owner_id: data.id
      };
      
      setBusiness(profile);
    } catch (error) {
      console.error('Error loading business:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function checkCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      // Check if following
      // This would check a business_followers table in production
    }
  }
  
  async function handleFollow() {
    if (!currentUserId || !business) return;
    
    setIsFollowing(!isFollowing);
    // In production, this would update a business_followers table
    
    // Optimistically update follower count
    setBusiness(prev => prev ? {
      ...prev,
      follower_count: isFollowing ? prev.follower_count - 1 : prev.follower_count + 1
    } : null);
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 dark:bg-gray-700" />
          <div className="container-app py-8">
            <div className="flex items-start gap-6">
              <div className="w-32 h-32 rounded-2xl bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-3">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Business not found</h1>
          <p className="text-gray-600 dark:text-gray-400">
            The business profile you're looking for doesn't exist.
          </p>
          <Link href="/business" className="btn btn-brand mt-4">
            Browse Businesses
          </Link>
        </div>
      </div>
    );
  }
  
  const isOwner = currentUserId === business.owner_id;
  const openStatus = isOpenNow();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 bg-gradient-to-br from-purple-400 via-pink-300 to-yellow-200">
        {business.cover_url && (
          <img
            src={business.cover_url}
            alt="Cover"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        
        {/* Back Button */}
        <div className="absolute top-4 left-4">
          <Link
            href="/business"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-full hover:bg-white dark:hover:bg-gray-800 transition-colors"
          >
            <span>←</span>
            <span>Back</span>
          </Link>
        </div>
        
        {/* Edit Button (Owner Only) */}
        {isOwner && (
          <div className="absolute top-4 right-4">
            <Link
              href="/business/edit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-full hover:bg-white dark:hover:bg-gray-800 transition-colors"
            >
              <span>✏️</span>
              <span>Edit Profile</span>
            </Link>
          </div>
        )}
      </div>
      
      {/* Main Content */}
      <div className="container-app -mt-20 relative z-10">
        {/* Profile Header Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              <div className="relative">
                <img
                  src={business.logo_url || '/placeholder.png'}
                  alt={business.name}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border-4 border-white dark:border-gray-700 shadow-lg"
                />
                {business.verified && (
                  <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white rounded-full p-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
            
            {/* Business Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {business.name}
                    {business.verified && (
                      <span className="text-blue-500 text-sm font-normal bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                        Verified
                      </span>
                    )}
                  </h1>
                  
                  {business.tagline && (
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {business.tagline}
                    </p>
                  )}
                  
                  {/* Quick Stats */}
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                    {business.rating_avg && (
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        <span className="font-semibold">{business.rating_avg.toFixed(1)}</span>
                        <span className="text-gray-500">({business.rating_count} reviews)</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <span className="text-purple-500">💜</span>
                      <span className="font-semibold">{business.follower_count}</span>
                      <span className="text-gray-500">followers</span>
                    </div>
                    
                    {business.price_range && (
                      <div className="text-gray-600 dark:text-gray-400">
                        {business.price_range}
                      </div>
                    )}
                    
                    {openStatus !== null && (
                      <div className="flex items-center gap-1">
                        <span className={`inline-block w-2 h-2 rounded-full ${openStatus ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={openStatus ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {getNextOpenTime()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  {!isOwner && (
                    <button
                      onClick={handleFollow}
                      className={`px-6 py-2 rounded-xl font-medium transition-all ${
                        isFollowing
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                  
                  <button className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 0A9.001 9.001 0 0012 21c4.474 0 8.268-3.12 9.032-7.326" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Primary CTAs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t dark:border-gray-700">
            {business.phone_public && business.phone_number && (
              <a
                href={`tel:${business.phone_number}`}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                  📞
                </div>
                <span className="text-sm font-medium">Call</span>
              </a>
            )}
            
            {business.email_public && business.email && (
              <a
                href={`mailto:${business.email}`}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                  ✉️
                </div>
                <span className="text-sm font-medium">Message</span>
              </a>
            )}
            
            {business.booking_url && (
              <a
                href={business.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400">
                  📅
                </div>
                <span className="text-sm font-medium">Book</span>
              </a>
            )}
            
            {business.location_is_public && business.location_text && (
              <button className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400">
                  📍
                </div>
                <span className="text-sm font-medium">Directions</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Content Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - About & Details */}
          <div className="md:col-span-2 space-y-6">
            {/* About Section */}
            {business.description && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-4">About</h2>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {business.description}
                </p>
              </div>
            )}
            
            {/* Services Section */}
            {business.services && business.services.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Services</h2>
                  {business.services.length > 4 && (
                    <button
                      onClick={() => setShowAllServices(!showAllServices)}
                      className="text-purple-600 dark:text-purple-400 text-sm font-medium"
                    >
                      {showAllServices ? 'Show Less' : `View All (${business.services.length})`}
                    </button>
                  )}
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  {business.services.slice(0, showAllServices ? undefined : 4).map((service) => (
                    <div
                      key={service.id}
                      className="border dark:border-gray-700 rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      {service.image_url && (
                        <img
                          src={service.image_url}
                          alt={service.title}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                      )}
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {service.title}
                      </h3>
                      {service.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {service.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        {service.price && (
                          <span className="text-green-600 dark:text-green-400 font-semibold">
                            {service.price}
                          </span>
                        )}
                        {service.duration && (
                          <span className="text-sm text-gray-500">
                            {service.duration}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Gallery Section */}
            {business.gallery && business.gallery.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-4">Gallery</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {business.gallery.slice(0, 6).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedImage(item.url)}
                      className="relative aspect-square rounded-xl overflow-hidden hover:opacity-90 transition-opacity"
                    >
                      <img
                        src={item.url}
                        alt={item.caption || 'Gallery image'}
                        className="w-full h-full object-cover"
                      />
                      {item.type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                            ▶️
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {business.gallery.length > 6 && (
                  <button className="w-full mt-4 py-2 text-purple-600 dark:text-purple-400 font-medium">
                    View All Photos ({business.gallery.length})
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Right Column - Info & Actions */}
          <div className="space-y-6">
            {/* Business Hours */}
            {business.hours && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
                <h3 className="font-bold mb-4">Hours</h3>
                <div className="space-y-2">
                  {Object.entries(business.hours).map(([day, hours]) => {
                    if (day === 'timezone') return null;
                    const dayHours = hours as DayHours;
                    const isToday = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' }) === day;
                    
                    return (
                      <div
                        key={day}
                        className={`flex justify-between text-sm ${
                          isToday ? 'font-semibold text-purple-600 dark:text-purple-400' : ''
                        }`}
                      >
                        <span className="capitalize">{day}</span>
                        <span>
                          {dayHours.closed
                            ? 'Closed'
                            : `${formatTime(dayHours.open)} - ${formatTime(dayHours.close)}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Location */}
            {business.location_is_public && business.location_text && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
                <h3 className="font-bold mb-4">Location</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  {business.location_text}
                </p>
                <button className="w-full py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors">
                  Get Directions
                </button>
              </div>
            )}
            
            {/* Additional Info */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
              <h3 className="font-bold mb-4">Details</h3>
              <div className="space-y-3">
                {business.languages && business.languages.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-500">Languages</span>
                    <p className="text-gray-900 dark:text-white">
                      {business.languages.join(', ')}
                    </p>
                  </div>
                )}
                
                {business.amenities && business.amenities.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-500">Amenities</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {business.amenities.map((amenity) => (
                        <span
                          key={amenity}
                          className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {business.website_url && (
                  <div>
                    <span className="text-sm text-gray-500">Website</span>
                    <a
                      href={business.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 dark:text-purple-400 hover:underline block truncate"
                    >
                      {business.website_url.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            {/* Social Links */}
            {business.social_links && Object.keys(business.social_links).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
                <h3 className="font-bold mb-4">Connect</h3>
                <div className="flex flex-wrap gap-3">
                  {business.social_links.instagram && (
                    <a
                      href={`https://instagram.com/${business.social_links.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      <span className="text-lg">📷</span>
                    </a>
                  )}
                  {business.social_links.facebook && (
                    <a
                      href={`https://facebook.com/${business.social_links.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      <span className="text-lg">f</span>
                    </a>
                  )}
                  {business.social_links.tiktok && (
                    <a
                      href={`https://tiktok.com/@${business.social_links.tiktok}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      <span className="text-lg">🎵</span>
                    </a>
                  )}
                  {business.social_links.youtube && (
                    <a
                      href={`https://youtube.com/${business.social_links.youtube}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      <span className="text-lg">▶</span>
                    </a>
                  )}
                </div>
              </div>
            )}
            
            {/* Report Button */}
            <div className="text-center">
              <button className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                Report this business
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Lightbox for Gallery */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-2xl hover:scale-110 transition-transform"
            onClick={() => setSelectedImage(null)}
          >
            ✕
          </button>
          <img
            src={selectedImage}
            alt="Gallery view"
            className="max-w-full max-h-full rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      
      {/* Mobile Sticky CTA Bar */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-4 z-40">
        <div className="flex gap-3">
          {business.booking_url && (
            <a
              href={business.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-medium text-center"
            >
              Book Now
            </a>
          )}
          {business.phone_public && business.phone_number && (
            <a
              href={`tel:${business.phone_number}`}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium text-center"
            >
              Call
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
