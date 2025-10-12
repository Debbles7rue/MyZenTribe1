// app/albums/[id]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AlbumElement from '@/components/album/AlbumElement';
import AlbumPageComments from '@/components/album/AlbumPageComments';
import { AlbumElement as ElementType } from '@/components/album/constants/scrapbookAssets';

type AlbumData = {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  privacy: string;
  status: string;
  created_at: string;
  creator?: {
    full_name: string;
    avatar_url: string;
  };
};

type Collaborator = {
  id: string;
  user_id: string;
  can_edit: boolean;
  status: string;
  user?: {
    full_name: string;
    avatar_url: string;
  };
};

type AlbumPage = {
  id: string;
  page_number: number;
  background_color: string;
  template: string;
  elements: ElementType[];
};

export default function AlbumViewerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [pages, setPages] = useState<AlbumPage[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<'pending' | 'accepted' | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Load album data
  useEffect(() => {
    if (!userId) return;
    loadAlbum();
  }, [userId, params.id]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        setCurrentPageIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentPageIndex(prev => Math.min(pages.length - 1, prev + 1));
      }
    }

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [pages.length]);

  async function loadAlbum() {
    try {
      // Load album details
      const { data: albumData, error: albumError } = await supabase
        .from('albums')
        .select(`
          *,
          creator:profiles!creator_id(full_name, avatar_url)
        `)
        .eq('id', params.id)
        .single();

      if (albumError) {
        console.error('Error loading album:', albumError);
        return;
      }

      setAlbum(albumData);

      // Check if user can edit (is creator or accepted collaborator)
      const isCreator = albumData.creator_id === userId;
      setCanEdit(isCreator);

      // Load collaborators
      const { data: collabData } = await supabase
        .from('album_collaborators')
        .select(`
          *,
          user:profiles!user_id(full_name, avatar_url)
        `)
        .eq('album_id', params.id);

      if (collabData) {
        setCollaborators(collabData);
        
        // Check if current user is a collaborator
        const userCollab = collabData.find(c => c.user_id === userId);
        if (userCollab) {
          setInviteStatus(userCollab.status);
          if (userCollab.status === 'accepted' && userCollab.can_edit) {
            setCanEdit(true);
          }
        }
      }

      // Load pages and elements
      const { data: pagesData } = await supabase
        .from('album_pages')
        .select(`
          *,
          elements:album_elements(*)
        `)
        .eq('album_id', params.id)
        .order('page_number');

      if (pagesData) {
        const loadedPages: AlbumPage[] = pagesData.map(page => ({
          id: page.id,
          page_number: page.page_number,
          background_color: page.background_color || '#ffffff',
          template: page.template || 'freeform',
          elements: page.elements.map((el: any) => ({
            id: el.id,
            type: el.type,
            content: el.content,
            x: el.position_x,
            y: el.position_y,
            width: el.width,
            height: el.height,
            rotation: el.rotation || 0,
            zIndex: el.z_index,
            fontSize: el.font_size,
            fontColor: el.font_color,
            fontFamily: el.font_family,
            frameStyle: el.frame_style,
            labelStyle: el.label_style,
            decorationType: el.decoration_type
          }))
        }));
        setPages(loadedPages);
      }
    } catch (error) {
      console.error('Error loading album:', error);
    } finally {
      setLoading(false);
    }
  }

  // Accept collaboration invite
  async function acceptInvite() {
    if (!userId || !album) return;

    try {
      const { error } = await supabase
        .from('album_collaborators')
        .update({ status: 'accepted' })
        .eq('album_id', album.id)
        .eq('user_id', userId);

      if (!error) {
        setInviteStatus('accepted');
        setCanEdit(true);
        loadAlbum();
      }
    } catch (error) {
      console.error('Error accepting invite:', error);
    }
  }

  // Decline collaboration invite
  async function declineInvite() {
    if (!userId || !album) return;

    try {
      const { error } = await supabase
        .from('album_collaborators')
        .update({ status: 'declined' })
        .eq('album_id', album.id)
        .eq('user_id', userId);

      if (!error) {
        setInviteStatus(null);
        router.push('/profile');
      }
    } catch (error) {
      console.error('Error declining invite:', error);
    }
  }

  // Navigate to edit mode
  function openEditor() {
    router.push(`/albums/${params.id}/edit`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p>Loading album...</p>
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Album not found</p>
          <button onClick={() => router.push('/profile')} className="btn">
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  const currentPage = pages[currentPageIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4 album-viewer">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-4 album-header">
          <div className="flex justify-between items-start header-content">
            <div className="header-info">
              <h1 className="text-3xl font-bold mb-2 album-title">{album.title}</h1>
              {album.description && (
                <p className="text-gray-600 mb-4 album-description">{album.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-gray-500 album-meta">
                <div className="flex items-center gap-2">
                  {album.creator?.avatar_url && (
                    <img 
                      src={album.creator.avatar_url} 
                      alt="" 
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <span>Created by {album.creator?.full_name || 'Unknown'}</span>
                </div>
                <span>•</span>
                <span>{new Date(album.created_at).toLocaleDateString()}</span>
                <span>•</span>
                <span className="capitalize">{album.privacy}</span>
              </div>
            </div>

            <div className="flex gap-2 header-actions">
              {canEdit && (
                <button
                  onClick={openEditor}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                >
                  ✏️ Edit Album
                </button>
              )}
              <button
                onClick={() => router.push('/albums')}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Back
              </button>
            </div>
          </div>

          {/* Collaboration Invite Banner */}
          {inviteStatus === 'pending' && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg invite-banner">
              <p className="text-yellow-800 mb-3">
                You've been invited to collaborate on this album!
              </p>
              <div className="flex gap-2 invite-actions">
                <button
                  onClick={acceptInvite}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  ✅ Accept
                </button>
                <button
                  onClick={declineInvite}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  ❌ Decline
                </button>
              </div>
            </div>
          )}

          {/* Collaborators List */}
          {collaborators.length > 0 && (
            <div className="mt-4 collaborators-section">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Collaborators:</h3>
              <div className="flex flex-wrap gap-2">
                {collaborators.map(collab => (
                  <div 
                    key={collab.id}
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                      collab.status === 'accepted' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {collab.user?.avatar_url && (
                      <img 
                        src={collab.user.avatar_url} 
                        alt="" 
                        className="w-5 h-5 rounded-full"
                      />
                    )}
                    <span>{collab.user?.full_name || 'Unknown'}</span>
                    {collab.status === 'pending' && (
                      <span className="text-xs">(Pending)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Album Page Viewer - BOOK FLIP STYLE */}
        {currentPage ? (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4 page-viewer">
            <div className="flex justify-between items-center mb-4 page-header">
              <h2 className="text-xl font-semibold page-title">
                📖 Page {currentPageIndex + 1} of {pages.length}
              </h2>
              <div className="text-sm text-gray-500 page-template-badge">
                {currentPage.template !== 'freeform' && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded">
                    {currentPage.template} layout
                  </span>
                )}
              </div>
            </div>

            {/* Page Canvas */}
            <div 
              className="relative border-2 border-gray-200 rounded-lg overflow-hidden shadow-inner page-canvas"
              style={{
                minHeight: '600px',
                backgroundColor: currentPage.background_color || '#ffffff'
              }}
            >
              {currentPage.elements && currentPage.elements.length > 0 ? (
                currentPage.elements.map((element) => (
                  <AlbumElement
                    key={element.id}
                    element={element}
                    isSelected={false}
                    isEditable={false}
                    onMouseDown={() => {}}
                    onClick={() => {}}
                    onResizeStart={() => {}}
                  />
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <p className="text-3xl mb-2">📄</p>
                    <p>This page is empty</p>
                  </div>
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="mt-6 comments-section">
              <AlbumPageComments
                pageId={currentPage.id}
                albumId={params.id}
                currentUserId={userId}
              />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <p className="text-center text-gray-500">No pages in this album</p>
          </div>
        )}

        {/* Page Navigation - BOOK FLIP STYLE */}
        {pages.length > 1 && (
          <div className="bg-white rounded-xl shadow-lg p-4 page-navigation">
            <div className="flex items-center justify-between nav-controls">
              <button
                onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                disabled={currentPageIndex === 0}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all flex items-center gap-2 nav-button"
              >
                <span className="text-xl">←</span>
                <span>Previous</span>
              </button>

              {/* Page Numbers */}
              <div className="flex gap-2 overflow-x-auto max-w-md page-numbers">
                {pages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPageIndex(index)}
                    className={`min-w-[40px] h-10 rounded-lg font-semibold transition-all ${
                      index === currentPageIndex 
                        ? 'bg-purple-500 text-white shadow-lg scale-110' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))}
                disabled={currentPageIndex === pages.length - 1}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all flex items-center gap-2 nav-button"
              >
                <span>Next</span>
                <span className="text-xl">→</span>
              </button>
            </div>

            {/* Page Counter */}
            <div className="text-center mt-3 text-sm text-gray-500 page-counter">
              Page {currentPageIndex + 1} of {pages.length}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {pages.length > 0 && (
          <div className="mt-4 text-center space-y-2 tips-section">
            <p className="text-sm text-gray-600">
              💡 Tip: Use arrow keys to navigate between pages
            </p>
            <p className="text-sm text-gray-600">
              💬 Leave comments on each page to share memories!
            </p>
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

        .btn {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          color: white;
          border-radius: 0.5rem;
          font-weight: 500;
          border: none;
          cursor: pointer;
        }

        /* Mobile Optimizations */
        @media (max-width: 768px) {
          .album-viewer {
            padding: 0.5rem;
          }

          .album-header {
            padding: 1rem;
          }

          .header-content {
            flex-direction: column;
            gap: 1rem;
          }

          .header-info {
            width: 100%;
          }

          .album-title {
            font-size: 1.5rem;
            line-height: 1.3;
          }

          .album-description {
            font-size: 14px;
          }

          .album-meta {
            flex-wrap: wrap;
            font-size: 12px;
            gap: 0.5rem;
          }

          .album-meta span {
            white-space: nowrap;
          }

          .header-actions {
            width: 100%;
            flex-direction: column;
          }

          .header-actions button {
            width: 100%;
            padding: 0.875rem;
            font-size: 14px;
            touch-action: manipulation;
          }

          .invite-banner {
            padding: 0.875rem;
          }

          .invite-actions {
            flex-direction: column;
          }

          .invite-actions button {
            width: 100%;
            padding: 0.875rem;
            font-size: 14px;
            touch-action: manipulation;
          }

          .collaborators-section {
            font-size: 14px;
          }

          .page-viewer {
            padding: 0.75rem;
          }

          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .page-title {
            font-size: 1.125rem;
          }

          .page-template-badge {
            font-size: 12px;
          }

          .page-canvas {
            min-height: 400px !important;
          }

          .comments-section {
            margin-top: 1rem;
          }

          .page-navigation {
            padding: 0.75rem;
          }

          .nav-controls {
            flex-direction: column;
            gap: 1rem;
          }

          .nav-button {
            width: 100%;
            justify-content: center;
            padding: 0.875rem 1rem;
            font-size: 14px;
            touch-action: manipulation;
          }

          .page-numbers {
            width: 100%;
            max-width: 100%;
            justify-content: center;
            padding: 0.5rem 0;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .page-numbers::-webkit-scrollbar {
            height: 4px;
          }

          .page-numbers::-webkit-scrollbar-thumb {
            background: #d1d5db;
            border-radius: 2px;
          }

          .page-numbers button {
            min-width: 36px;
            height: 36px;
            font-size: 14px;
            flex-shrink: 0;
          }

          .page-counter {
            font-size: 13px;
          }

          .tips-section {
            padding: 0 0.5rem;
          }

          .tips-section p {
            font-size: 13px;
          }
        }

        /* Small mobile screens */
        @media (max-width: 480px) {
          .album-title {
            font-size: 1.25rem;
          }

          .album-meta {
            font-size: 11px;
          }

          .page-title {
            font-size: 1rem;
          }

          .page-canvas {
            min-height: 350px !important;
          }

          .nav-button {
            padding: 0.75rem;
            font-size: 13px;
          }

          .nav-button span:not(.text-xl) {
            display: none;
          }

          .page-numbers button {
            min-width: 32px;
            height: 32px;
            font-size: 13px;
          }
        }

        /* Landscape mobile orientation */
        @media (max-width: 768px) and (orientation: landscape) {
          .page-canvas {
            min-height: 300px !important;
          }

          .album-title {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}
