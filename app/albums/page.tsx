// app/albums/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Album = {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  page_count: number;
  privacy: string;
  creator_id: string;
  created_at: string;
  role: 'creator' | 'collaborator';
  invite_status?: string;
};

export default function AlbumsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'created' | 'collaborated'>('all');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (userId) {
      loadAlbums();
    }
  }, [userId, filter]);

  async function loadAlbums() {
    try {
      setLoading(true);
      const albumsList: Album[] = [];

      // Load albums created by user
      if (filter === 'all' || filter === 'created') {
        const { data: createdAlbums } = await supabase
          .from('albums')
          .select('*')
          .eq('creator_id', userId)
          .order('created_at', { ascending: false });

        if (createdAlbums) {
          albumsList.push(...createdAlbums.map(a => ({ ...a, role: 'creator' as const })));
        }
      }

      // Load albums where user is a collaborator
      if (filter === 'all' || filter === 'collaborated') {
        const { data: collabs } = await supabase
          .from('album_collaborators')
          .select(`
            status,
            album:albums(*)
          `)
          .eq('user_id', userId);

        if (collabs) {
          const collabAlbums = collabs
            .filter(c => c.album)
            .map(c => ({
              ...c.album,
              role: 'collaborator' as const,
              invite_status: c.status
            }));
          albumsList.push(...collabAlbums);
        }
      }

      // Sort by created_at
      albumsList.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setAlbums(albumsList);
    } catch (error) {
      console.error('Error loading albums:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p>Loading your albums...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 albums-page" style={{ minHeight: '100vh', overflowY: 'auto', position: 'relative' }}>
      <div className="max-w-6xl mx-auto p-4 albums-container" style={{ paddingTop: '1rem', paddingBottom: '2rem' }}>
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 albums-header">
          <div className="flex justify-between items-center mb-4 header-top">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent page-title">
              My Albums
            </h1>
            <div className="flex gap-2 header-actions">
              <Link
                href="/albums/create"
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 create-button"
              >
                📸 Create Album
              </Link>
              <button
                onClick={() => router.push('/profile')}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 back-button"
              >
                Back to Profile
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 filter-tabs">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg filter-button ${
                filter === 'all' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              All Albums
            </button>
            <button
              onClick={() => setFilter('created')}
              className={`px-4 py-2 rounded-lg filter-button ${
                filter === 'created' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Created by Me
            </button>
            <button
              onClick={() => setFilter('collaborated')}
              className={`px-4 py-2 rounded-lg filter-button ${
                filter === 'collaborated' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Collaborations
            </button>
          </div>
        </div>

        {/* Albums Grid */}
        {albums.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 albums-grid">
            {albums.map(album => (
              <Link
                key={album.id}
                href={`/albums/${album.id}`}
                className="group album-card-link"
              >
                <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow album-card">
                  {/* Cover Image */}
                  <div className="aspect-video bg-gradient-to-br from-purple-100 to-pink-100 relative overflow-hidden album-cover">
                    {album.cover_image ? (
                      <img 
                        src={album.cover_image} 
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-6xl">📸</span>
                      </div>
                    )}
                    
                    {/* Role Badge */}
                    <div className="absolute top-2 right-2 role-badge">
                      {album.role === 'creator' ? (
                        <span className="px-2 py-1 bg-purple-500 text-white text-xs rounded-full">
                          Creator
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                          Collaborator
                        </span>
                      )}
                    </div>

                    {/* Invite Status Badge */}
                    {album.invite_status === 'pending' && (
                      <div className="absolute top-2 left-2 invite-badge">
                        <span className="px-2 py-1 bg-yellow-500 text-white text-xs rounded-full">
                          Pending Invite
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Album Info */}
                  <div className="p-4 album-info">
                    <h3 className="font-semibold text-lg mb-1 group-hover:text-purple-600 transition-colors album-title">
                      {album.title}
                    </h3>
                    {album.description && (
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2 album-description">
                        {album.description}
                      </p>
                    )}
                    <div className="flex justify-between items-center text-sm text-gray-500 album-stats">
                      <span>{album.page_count} page{album.page_count !== 1 ? 's' : ''}</span>
                      <span className="capitalize">{album.privacy}</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-400 album-date">
                      {new Date(album.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center empty-state">
            <div className="text-6xl mb-4 empty-icon">📸</div>
            <h2 className="text-2xl font-semibold mb-2 empty-title">No Albums Yet</h2>
            <p className="text-gray-600 mb-4 empty-text">
              {filter === 'collaborated' 
                ? "You haven't been invited to any albums yet"
                : "Start creating beautiful photo albums to share memories"}
            </p>
            {filter !== 'created' && (
              <Link
                href="/albums/create"
                className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 empty-create-button"
              >
                Create Your First Album
              </Link>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .loading-spinner {
          width: 2rem;
          height: 2rem;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Mobile Optimizations */
        @media (max-width: 768px) {
          .albums-page {
            padding: 0;
          }

          .albums-container {
            padding: 0.5rem !important;
            padding-bottom: 1.5rem !important;
          }

          .albums-header {
            padding: 1rem;
            margin-bottom: 1rem;
          }

          .header-top {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .page-title {
            font-size: 1.75rem;
            width: 100%;
          }

          .header-actions {
            width: 100%;
            flex-direction: column;
          }

          .create-button,
          .back-button {
            width: 100%;
            padding: 0.875rem;
            font-size: 14px;
            touch-action: manipulation;
            text-align: center;
          }

          .filter-tabs {
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .filter-button {
            flex: 1;
            min-width: calc(50% - 0.25rem);
            padding: 0.75rem 0.5rem;
            font-size: 13px;
            touch-action: manipulation;
            white-space: nowrap;
          }

          .albums-grid {
            gap: 1rem;
            grid-template-columns: 1fr;
          }

          .album-card {
            touch-action: manipulation;
          }

          .album-cover {
            aspect-ratio: 16/9;
          }

          .role-badge span,
          .invite-badge span {
            font-size: 10px;
            padding: 0.375rem 0.625rem;
          }

          .album-info {
            padding: 0.875rem;
          }

          .album-title {
            font-size: 1rem;
            line-height: 1.4;
          }

          .album-description {
            font-size: 13px;
            line-height: 1.4;
          }

          .album-stats {
            font-size: 12px;
          }

          .album-date {
            font-size: 11px;
          }

          .empty-state {
            padding: 2rem 1rem;
          }

          .empty-icon {
            font-size: 3rem;
          }

          .empty-title {
            font-size: 1.5rem;
          }

          .empty-text {
            font-size: 14px;
          }

          .empty-create-button {
            padding: 0.875rem 1.5rem;
            font-size: 14px;
            touch-action: manipulation;
          }
        }

        /* Small mobile screens */
        @media (max-width: 480px) {
          .page-title {
            font-size: 1.5rem;
          }

          .filter-button {
            font-size: 12px;
            padding: 0.625rem 0.375rem;
          }

          .album-title {
            font-size: 0.95rem;
          }

          .album-description {
            font-size: 12px;
          }

          .album-stats {
            font-size: 11px;
          }

          .empty-state {
            padding: 1.5rem 0.75rem;
          }

          .empty-title {
            font-size: 1.25rem;
          }

          .empty-text {
            font-size: 13px;
          }
        }

        /* Tablet landscape - 2 columns */
        @media (min-width: 640px) and (max-width: 1023px) {
          .albums-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* Landscape mobile orientation */
        @media (max-width: 768px) and (orientation: landscape) {
          .albums-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .page-title {
            font-size: 1.5rem;
          }

          .empty-state {
            padding: 1.5rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}
