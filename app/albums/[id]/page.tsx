// app/albums/[id]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import CommentSection from '@/components/CommentSection'; // ← ADD THIS LINE

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
  elements: AlbumElement[];
};

type AlbumElement = {
  id: string;
  type: string;
  content: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  z_index: number;
  font_size?: number;
  font_color?: string;
  font_family?: string;
};

export default function AlbumViewerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [pages, setPages] = useState<AlbumPage[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
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
        setPages(pagesData);
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

  // Navigate to edit mode (full editor)
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
                onClick={() => router.push('/profile')}
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

        {/* Album Viewer */}
        {currentPage ? (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Page {currentPageIndex + 1} of {pages.length}
              </h2>
            </div>

            <div 
              className="relative border-2 border-gray-200 rounded-lg overflow-hidden"
              style={{
                minHeight: '500px',
                backgroundColor: currentPage.background_color || '#ffffff'
              }}
            >
              {currentPage.elements && currentPage.elements.length > 0 ? (
                currentPage.elements.map((element) => (
                  <div
                    key={element.id}
                    className="absolute"
                    style={{
                      left: `${element.position_x}%`,
                      top: `${element.position_y}%`,
                      width: `${element.width}%`,
                      height: `${element.height}%`,
                      transform: `rotate(${element.rotation || 0}deg)`,
                      zIndex: element.z_index
                    }}
                  >
                    {element.type === 'photo' && (
                      <img 
                        src={element.content} 
                        alt="" 
                        className="w-full h-full object-cover rounded-lg shadow-lg"
                      />
                    )}
                    {element.type === 'video' && (
                      <video 
                        src={element.content}
                        controls
                        className="w-full h-full object-cover rounded-lg shadow-lg"
                      />
                    )}
                    {element.type === 'text' && (
                      <div 
                        style={{
                          fontSize: `${element.font_size}px`,
                          color: element.font_color,
                          fontFamily: element.font_family,
                          padding: '8px'
                        }}
                      >
                        {element.content}
                      </div>
                    )}
                    {element.type === 'sticker' && (
                      <div 
                        className="flex items-center justify-center w-full h-full"
                        style={{ fontSize: `${element.font_size || 48}px` }}
                      >
                        {element.content}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p>No content on this page</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <p className="text-center text-gray-500">No pages in this album</p>
          </div>
        )}

        {/* Page Navigation */}
        {pages.length > 1 && (
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                disabled={currentPageIndex === 0}
                className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
              >
                ← Previous
              </button>

              <div className="flex gap-2">
                {pages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPageIndex(index)}
                    className={`w-10 h-10 rounded-lg ${
                      index === currentPageIndex 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))}
                disabled={currentPageIndex === pages.length - 1}
                className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
              >
                Next →
              </button>
            </div>
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
