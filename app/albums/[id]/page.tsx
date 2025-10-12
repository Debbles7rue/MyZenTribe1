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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">{album.title}</h1>
              {album.description && (
                <p className="text-gray-600 mb-4">{album.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
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

            <div className="flex gap-2">
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
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 mb-3">
                You've been invited to collaborate on this album!
              </p>
              <div className="flex gap-2">
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
            <div className="mt-4">
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
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                📖 Page {currentPageIndex + 1} of {pages.length}
              </h2>
              <div className="text-sm text-gray-500">
                {currentPage.template !== 'freeform' && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded">
                    {currentPage.template} layout
                  </span>
                )}
              </div>
            </div>

            {/* Page Canvas */}
            <div 
              className="relative border-2 border-gray-200 rounded-lg overflow-hidden shadow-inner"
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
            <div className="mt-6">
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
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                disabled={currentPageIndex === 0}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all flex items-center gap-2"
              >
                <span className="text-xl">←</span>
                <span>Previous</span>
              </button>

              {/* Page Numbers */}
              <div className="flex gap-2 overflow-x-auto max-w-md">
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
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all flex items-center gap-2"
              >
                <span>Next</span>
                <span className="text-xl">→</span>
              </button>
            </div>

            {/* Page Counter */}
            <div className="text-center mt-3 text-sm text-gray-500">
              Page {currentPageIndex + 1} of {pages.length}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {pages.length > 0 && (
          <div className="mt-4 text-center space-y-2">
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
      `}</style>
    </div>
  );
}
