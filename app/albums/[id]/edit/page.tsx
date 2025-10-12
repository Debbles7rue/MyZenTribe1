// app/albums/[id]/edit/page.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import FriendSelector from '@/components/FriendSelector';

// Types
type AlbumElement = {
  id: string;
  type: 'photo' | 'video' | 'text' | 'sticker';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  fontSize?: number;
  fontColor?: string;
  fontFamily?: string;
};

type AlbumPage = {
  id: string;
  pageId?: string; // Database ID for existing pages
  elements: AlbumElement[];
  backgroundColor: string;
  backgroundImage?: string;
  template: string;
};

// Expanded sticker library
const STICKER_LIBRARY = {
  emotions: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️'],
  celebration: ['🎉', '🎊', '🎈', '🎁', '🎂', '🎄', '🎃', '🎆', '🎇', '🧨', '✨', '🎐', '🎀', '🎗️', '🎟️', '🎫', '🎖️', '🏆', '🏅', '🥇', '🥈', '🥉'],
  nature: ['🌸', '💮', '🏵️', '🌺', '🌻', '🌷', '🌹', '🥀', '🌼', '🌵', '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🌾', '🌙', '☀️', '⭐', '🌟', '✨', '⚡', '🔥', '💫', '🌈'],
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦄', '🐴', '🐝', '🦋', '🐌', '🐞', '🐢', '🐙', '🦀', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈'],
  food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍔', '🍕', '🌭', '🥪', '🌮', '🌯', '🍿', '🍩', '🍪', '🎂', '🍰', '🧁', '🍫', '🍬', '🍭', '🍮'],
  activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🎮', '🎯', '🎲', '🎰', '🎳', '🎸', '🎵', '🎶', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎻', '🎬', '🎨', '🎭', '🎪', '🎟️', '🎫'],
  travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🛵', '🏍️', '🚲', '🛴', '✈️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛳️', '⛴️', '🚢', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🎡', '🎢', '🎠'],
  objects: ['💌', '📌', '📍', '📎', '🔗', '📏', '📐', '✂️', '🗃️', '🗄️', '🗑️', '🔒', '🔓', '🔏', '🔐', '🔑', '🗝️', '🔨', '🪓', '⛏️', '⚒️', '🛠️', '🗡️', '⚔️', '💣', '🪃', '🏹', '🛡️', '🪚', '🔧', '🪛', '🔩', '⚙️', '🗜️', '⚖️', '🔗', '⛓️', '🪝', '🧰', '🧲', '🪜', '⚗️', '🧪', '🧫', '🧬', '🔬', '🔭', '📡'],
  symbols: ['💋', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💤', '👋', '✋', '🖐️', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤝', '🙏']
};

export default function EditAlbumPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  
  // Album data
  const [albumId, setAlbumId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'private' | 'public'>('private');
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [existingCollaborators, setExistingCollaborators] = useState<any[]>([]);
  
  // Pages
  const [pages, setPages] = useState<AlbumPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [deletedPageIds, setDeletedPageIds] = useState<string[]>([]);
  const [deletedElementIds, setDeletedElementIds] = useState<string[]>([]);
  
  // UI states
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [editingText, setEditingText] = useState('');
  const [textStyle, setTextStyle] = useState({
    fontSize: 24,
    fontColor: '#000000',
    fontFamily: 'Arial'
  });

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);

  // Get user on mount
  useEffect(() => {
    let mounted = true;
    
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      if (mounted && data.user) {
        console.log('User loaded:', data.user.id);
        setUserId(data.user.id);
      } else if (mounted && !data.user) {
        console.log('No user found, redirecting to login');
        router.push('/login');
      }
    }
    
    getUser();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Load album data - only when we have userId
  useEffect(() => {
    if (userId && params.id) {
      console.log('Loading album with userId:', userId);
      loadAlbum();
    }
  }, [userId, params.id]);

  async function loadAlbum() {
    try {
      setLoading(true);

      // Make sure we have a userId before continuing
      if (!userId) {
        console.log('No userId yet, waiting...');
        return;
      }

      // Load album details
      const { data: albumData, error: albumError } = await supabase
        .from('albums')
        .select('*')
        .eq('id', params.id)
        .single();

      if (albumError || !albumData) {
        console.error('Error loading album:', albumError);
        alert('Album not found');
        router.push('/albums');
        return;
      }

      setAlbumId(albumData.id);
      setTitle(albumData.title);
      setDescription(albumData.description || '');
      setPrivacy(albumData.privacy);

      // Check if user can edit
      const userIsCreator = albumData.creator_id === userId;
      console.log('Permission check:', { userId, creatorId: albumData.creator_id, userIsCreator });
      setIsCreator(userIsCreator);
      setCanEdit(userIsCreator);

      // Check collaborator permissions
      if (!userIsCreator) {
        console.log('Not creator, checking collaborator permissions for user:', userId);
        
        const { data: collabData, error: collabError } = await supabase
          .from('album_collaborators')
          .select('*')
          .eq('album_id', params.id)
          .eq('user_id', userId)
          .single();

        console.log('Collaborator query result:', { collabData, collabError });

        if (collabError || !collabData) {
          console.log('No collaborator record found');
          alert('You do not have permission to edit this album');
          router.push(`/albums/${params.id}`);
          return;
        }

        if (collabData.status !== 'accepted' || !collabData.can_edit) {
          console.log('Collaborator exists but cannot edit:', collabData);
          alert('You do not have permission to edit this album');
          router.push(`/albums/${params.id}`);
          return;
        }

        console.log('Collaborator can edit!');
        setCanEdit(true);
      }

      // Load existing collaborators - split query to avoid foreign key issue
      const { data: collabs } = await supabase
        .from('album_collaborators')
        .select('*')
        .eq('album_id', params.id);

      if (collabs) {
        // Fetch user profiles separately
        const collabsWithProfiles = await Promise.all(
          collabs.map(async (collab) => {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', collab.user_id)
              .single();
            
            return {
              ...collab,
              user: userProfile
            };
          })
        );
        
        setExistingCollaborators(collabsWithProfiles);
        setCollaborators(collabs.map(c => c.user_id));
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

      if (pagesData && pagesData.length > 0) {
        const loadedPages: AlbumPage[] = pagesData.map(page => ({
          id: `page-${page.id}`,
          pageId: page.id,
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
            fontFamily: el.font_family
          })),
          backgroundColor: page.background_color || '#ffffff',
          template: page.template || 'freeform'
        }));
        setPages(loadedPages);
      } else {
        // Create a default page if none exist
        setPages([{
          id: 'page-new-1',
          elements: [],
          backgroundColor: '#ffffff',
          template: 'freeform'
        }]);
      }
    } catch (error) {
      console.error('Error loading album:', error);
      alert('Failed to load album');
      router.push('/albums');
    } finally {
      setLoading(false);
    }
  }

  // Handle photo/video upload
  async function handleMediaUpload(files: FileList) {
    if (!userId || files.length === 0) return;
    
    setUploading(true);
    const currentPage = pages[currentPageIndex];
    const newElements: AlbumElement[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/album-${Date.now()}-${i}.${fileExt}`;
        
        // Upload to storage
        const { data, error } = await supabase.storage
          .from('post-media')
          .upload(fileName, file);

        if (!error && data) {
          const { data: { publicUrl } } = supabase.storage
            .from('post-media')
            .getPublicUrl(fileName);

          const element: AlbumElement = {
            id: `element-new-${Date.now()}-${i}`,
            type: file.type.startsWith('video') ? 'video' : 'photo',
            content: publicUrl,
            x: 10 + (i * 15) % 60,
            y: 10 + Math.floor(i / 4) * 25,
            width: 25,
            height: 25,
            rotation: 0,
            zIndex: currentPage.elements.length + i
          };
          
          newElements.push(element);
        }
      }

      // Add elements to current page
      if (newElements.length > 0) {
        const updatedPages = [...pages];
        updatedPages[currentPageIndex] = {
          ...currentPage,
          elements: [...currentPage.elements, ...newElements]
        };
        setPages(updatedPages);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload media. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  // Add text element
  function addTextElement() {
    if (!editingText.trim()) return;

    const element: AlbumElement = {
      id: `text-new-${Date.now()}`,
      type: 'text',
      content: editingText,
      x: 30,
      y: 40,
      width: 30,
      height: 10,
      rotation: 0,
      zIndex: pages[currentPageIndex].elements.length,
      ...textStyle
    };

    const updatedPages = [...pages];
    updatedPages[currentPageIndex].elements.push(element);
    setPages(updatedPages);
    setShowTextEditor(false);
    setEditingText('');
  }

  // Add sticker
  function addSticker(emoji: string) {
    const element: AlbumElement = {
      id: `sticker-new-${Date.now()}`,
      type: 'sticker',
      content: emoji,
      x: 40 + Math.random() * 20,
      y: 40 + Math.random() * 20,
      width: 10,
      height: 10,
      rotation: 0,
      zIndex: pages[currentPageIndex].elements.length,
      fontSize: 48
    };

    const updatedPages = [...pages];
    updatedPages[currentPageIndex].elements.push(element);
    setPages(updatedPages);
    setShowStickerPicker(false);
  }

  // Delete element
  function deleteElement(elementId: string) {
    // Track deleted elements for database cleanup
    if (!elementId.includes('new')) {
      setDeletedElementIds([...deletedElementIds, elementId]);
    }
    
    const updatedPages = [...pages];
    updatedPages[currentPageIndex].elements = updatedPages[currentPageIndex].elements
      .filter(el => el.id !== elementId);
    setPages(updatedPages);
    setSelectedElement(null);
  }

  // Delete page
  function deletePage(pageIndex: number) {
    if (pages.length <= 1) {
      alert("You can't delete the last page");
      return;
    }

    const pageToDelete = pages[pageIndex];
    if (pageToDelete.pageId) {
      setDeletedPageIds([...deletedPageIds, pageToDelete.pageId]);
    }

    const updatedPages = pages.filter((_, i) => i !== pageIndex);
    setPages(updatedPages);
    
    // Adjust current page index if needed
    if (currentPageIndex >= updatedPages.length) {
      setCurrentPageIndex(updatedPages.length - 1);
    } else if (currentPageIndex > pageIndex) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  }

  // Handle element drag
  function handleElementMouseDown(elementId: string, e: React.MouseEvent) {
    e.preventDefault();
    setSelectedElement(elementId);
    setDraggedElement(elementId);

    const element = pages[currentPageIndex].elements.find(el => el.id === elementId);
    if (!element || !canvasRef.current) return;

    const canvas = canvasRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = element.x;
    const initialY = element.y;

    function handleMouseMove(e: MouseEvent) {
      const deltaX = ((e.clientX - startX) / canvas.width) * 100;
      const deltaY = ((e.clientY - startY) / canvas.height) * 100;

      const updatedPages = [...pages];
      const element = updatedPages[currentPageIndex].elements.find(el => el.id === elementId);
      if (element) {
        element.x = Math.max(0, Math.min(90, initialX + deltaX));
        element.y = Math.max(0, Math.min(90, initialY + deltaY));
        setPages([...updatedPages]);
      }
    }

    function handleMouseUp() {
      setDraggedElement(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  // Apply template
  function applyTemplate(template: string) {
    const updatedPages = [...pages];
    const currentPage = updatedPages[currentPageIndex];
    currentPage.template = template;

    // Rearrange existing photos based on template
    if (template === 'grid' && currentPage.elements.length > 0) {
      const photos = currentPage.elements.filter(el => el.type === 'photo');
      photos.forEach((photo, i) => {
        if (i < 4) {
          photo.x = (i % 2) * 48 + 2;
          photo.y = Math.floor(i / 2) * 48 + 2;
          photo.width = 46;
          photo.height = 46;
        }
      });
    } else if (template === 'feature' && currentPage.elements.length > 0) {
      const photos = currentPage.elements.filter(el => el.type === 'photo');
      if (photos[0]) {
        photos[0].x = 10;
        photos[0].y = 10;
        photos[0].width = 80;
        photos[0].height = 50;
      }
      photos.slice(1, 3).forEach((photo, i) => {
        photo.x = 10 + i * 40;
        photo.y = 65;
        photo.width = 35;
        photo.height = 25;
      });
    } else if (template === 'mosaic' && currentPage.elements.length > 0) {
      const photos = currentPage.elements.filter(el => el.type === 'photo');
      const positions = [
        { x: 2, y: 2, w: 30, h: 45 },
        { x: 34, y: 2, w: 30, h: 30 },
        { x: 66, y: 2, w: 32, h: 60 },
        { x: 2, y: 49, w: 30, h: 45 },
        { x: 34, y: 34, w: 30, h: 30 },
        { x: 34, y: 66, w: 30, h: 30 }
      ];
      photos.forEach((photo, i) => {
        if (i < positions.length) {
          photo.x = positions[i].x;
          photo.y = positions[i].y;
          photo.width = positions[i].w;
          photo.height = positions[i].h;
        }
      });
    }

    setPages(updatedPages);
  }

  // Change background
  function changeBackground(color: string) {
    const updatedPages = [...pages];
    updatedPages[currentPageIndex].backgroundColor = color;
    setPages(updatedPages);
    setShowBackgroundPicker(false);
  }

  // Add new page
  function addNewPage() {
    if (pages.length >= 100) {
      alert('Maximum 100 pages allowed');
      return;
    }
    
    setPages([...pages, {
      id: `page-new-${Date.now()}`,
      elements: [],
      backgroundColor: '#ffffff',
      template: 'freeform'
    }]);
    setCurrentPageIndex(pages.length);
  }

  // Update album
  async function updateAlbum() {
    if (!userId || !canEdit) {
      alert('You do not have permission to save changes');
      return;
    }

    if (!title.trim()) {
      alert('Please add a title');
      return;
    }

    setSaving(true);
    console.log('Starting update process...');

    try {
      // Find first photo for cover image
      let coverImage = null;
      for (const page of pages) {
        const photo = page.elements.find(el => el.type === 'photo');
        if (photo) {
          coverImage = photo.content;
          break;
        }
      }

      // Update album metadata
      const { error: albumError } = await supabase
        .from('albums')
        .update({
          title: title.trim(),
          description: description?.trim() || null,
          privacy,
          cover_image: coverImage,
          page_count: pages.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', albumId);

      if (albumError) {
        throw new Error(`Failed to update album: ${albumError.message}`);
      }

      console.log('Album metadata updated');

      // Delete removed pages
      if (deletedPageIds.length > 0) {
        console.log('Deleting pages:', deletedPageIds);
        await supabase
          .from('album_pages')
          .delete()
          .in('id', deletedPageIds);
      }

      // Delete removed elements
      if (deletedElementIds.length > 0) {
        console.log('Deleting elements:', deletedElementIds);
        await supabase
          .from('album_elements')
          .delete()
          .in('id', deletedElementIds);
      }

      // Update or create pages
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        let pageId = page.pageId;

        if (pageId) {
          // Update existing page
          const { error: pageUpdateError } = await supabase
            .from('album_pages')
            .update({
              page_number: i + 1,
              background_color: page.backgroundColor || '#ffffff',
              template: page.template || 'freeform'
            })
            .eq('id', pageId);

          if (pageUpdateError) throw pageUpdateError;

          // Delete all existing elements for this page (simpler than tracking individual changes)
          await supabase
            .from('album_elements')
            .delete()
            .eq('page_id', pageId);
        } else {
          // Create new page
          const { data: newPage, error: pageError } = await supabase
            .from('album_pages')
            .insert({
              album_id: albumId,
              page_number: i + 1,
              background_color: page.backgroundColor || '#ffffff',
              template: page.template || 'freeform'
            })
            .select()
            .single();

          if (pageError) throw pageError;
          pageId = newPage.id;
        }

        // Insert all elements for this page
        if (page.elements.length > 0 && pageId) {
          const elements = page.elements.map((el, index) => ({
            page_id: pageId,
            type: el.type,
            content: el.content,
            position_x: el.x || 0,
            position_y: el.y || 0,
            width: el.width || 25,
            height: el.height || 25,
            rotation: el.rotation || 0,
            z_index: index,
            font_size: el.fontSize || null,
            font_color: el.fontColor || null,
            font_family: el.fontFamily || null
          }));

          const { error: elementsError } = await supabase
            .from('album_elements')
            .insert(elements);

          if (elementsError) throw elementsError;
        }
      }

      // Update collaborators (only if user is creator)
      if (isCreator) {
        // Remove collaborators who were removed
        const removedCollabs = existingCollaborators
          .filter(ec => !collaborators.includes(ec.user_id))
          .map(ec => ec.user_id);

        if (removedCollabs.length > 0) {
          await supabase
            .from('album_collaborators')
            .delete()
            .eq('album_id', albumId)
            .in('user_id', removedCollabs);
        }

        // Add new collaborators
        const newCollabs = collaborators.filter(
          c => !existingCollaborators.some(ec => ec.user_id === c)
        );

        if (newCollabs.length > 0) {
          const collabData = newCollabs.map(friendId => ({
            album_id: albumId,
            user_id: friendId,
            can_edit: true,
            status: 'pending'
          }));

          await supabase.from('album_collaborators').insert(collabData);

          // Create notifications for new collaborators
          const notifications = newCollabs.map(friendId => ({
            user_id: friendId,
            type: 'album.invited',
            title: 'Album invitation',
            body: `You've been invited to collaborate on "${title}"`,
            target_url: `/albums/${albumId}`,
            entity_id: albumId,
            actor_id: userId
          }));

          await supabase.from('notifications').insert(notifications);
          console.log('Notifications sent to new collaborators');
        }
      }

      alert('Album updated successfully!');
      router.push(`/albums/${albumId}`);
      
    } catch (error: any) {
      console.error('Update failed:', error);
      alert(error.message || 'Failed to update album. Please try again.');
    } finally {
      setSaving(false);
    }
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

  if (!canEdit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">You don't have permission to edit this album</p>
          <button 
            onClick={() => router.push(`/albums/${params.id}`)}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Back to Album
          </button>
        </div>
      </div>
    );
  }

  const currentPage = pages[currentPageIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4 edit-album-page">
      <div className="max-w-6xl mx-auto edit-container">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-4 edit-header">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 page-title">
            Edit Album
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Album Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 title-input"
                placeholder="Summer Memories 2024"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Privacy
              </label>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 privacy-select"
                disabled={!isCreator}
              >
                <option value="private">Private (Only me & collaborators)</option>
                <option value="public">Public (Friends can see)</option>
              </select>
              {!isCreator && (
                <p className="text-xs text-gray-500 mt-1">Only the album creator can change privacy settings</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 description-textarea"
              rows={2}
              placeholder="Our amazing trip to the mountains..."
            />
          </div>

          {isCreator && (
            <div className="mt-4">
              <FriendSelector
                value={collaborators}
                onChange={setCollaborators}
                multiple={true}
                label="Invite Friends to Collaborate"
                placeholder="Search friends to add as co-creators..."
              />
              {existingCollaborators.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 mb-1">Current collaborators:</p>
                  <div className="flex flex-wrap gap-2">
                    {existingCollaborators.map(collab => (
                      <span key={collab.id} className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                        {collab.user?.full_name || 'Unknown'} 
                        {collab.status === 'pending' && ' (Pending)'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4 toolbar">
          <div className="flex flex-wrap gap-2 toolbar-buttons">
            <label className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg cursor-pointer hover:opacity-90 tool-button upload-button">
              {uploading ? 'Uploading...' : '📷 Add Photos/Videos'}
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => e.target.files && handleMediaUpload(e.target.files)}
                className="hidden"
                disabled={uploading}
              />
            </label>
            
            <button
              onClick={() => setShowTextEditor(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 tool-button"
            >
              📝 Add Text
            </button>
            
            <button
              onClick={() => setShowStickerPicker(true)}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 tool-button"
            >
              ✨ Stickers
            </button>
            
            <button
              onClick={() => setShowBackgroundPicker(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 tool-button"
            >
              🎨 Background
            </button>

            <select
              value={currentPage?.template || 'freeform'}
              onChange={(e) => applyTemplate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg template-select"
            >
              <option value="freeform">🎨 Freeform</option>
              <option value="grid">⊞ Grid (2x2)</option>
              <option value="feature">⭐ Feature</option>
              <option value="mosaic">🎭 Mosaic</option>
            </select>

            {pages.length > 1 && (
              <button
                onClick={() => deletePage(currentPageIndex)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 ml-auto delete-page-button"
              >
                🗑️ Delete Page
              </button>
            )}
          </div>
        </div>

        {/* Canvas */}
        {currentPage && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4 canvas-container">
            <div className="flex items-center justify-between mb-4 canvas-header">
              <h2 className="text-xl font-semibold canvas-title">Page {currentPageIndex + 1} of {pages.length}</h2>
              {selectedElement && (
                <button
                  onClick={() => deleteElement(selectedElement)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 delete-element-button"
                >
                  🗑️ Delete Selected
                </button>
              )}
            </div>

            <div
              ref={canvasRef}
              className="relative border-2 border-dashed border-gray-300 rounded-lg canvas"
              style={{
                minHeight: '500px',
                backgroundColor: currentPage.backgroundColor,
                cursor: draggedElement ? 'grabbing' : 'default'
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setSelectedElement(null);
                }
              }}
            >
              {currentPage.elements.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 empty-canvas">
                  <div className="text-center">
                    <p className="text-3xl mb-2">📸</p>
                    <p className="text-lg">Add photos or videos to this page</p>
                    <p className="text-sm mt-2">Click the buttons above to get started</p>
                  </div>
                </div>
              ) : (
                currentPage.elements.map((element) => (
                  <div
                    key={element.id}
                    className={`absolute transition-all canvas-element ${
                      selectedElement === element.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                    }`}
                    style={{
                      left: `${element.x}%`,
                      top: `${element.y}%`,
                      width: `${element.width}%`,
                      height: `${element.height}%`,
                      transform: `rotate(${element.rotation}deg)`,
                      zIndex: element.zIndex,
                      cursor: draggedElement === element.id ? 'grabbing' : 'move'
                    }}
                    onMouseDown={(e) => handleElementMouseDown(element.id, e)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElement(element.id);
                    }}
                  >
                    {element.type === 'photo' && (
                      <img 
                        src={element.content} 
                        alt="" 
                        className="w-full h-full object-cover rounded-lg shadow-lg"
                        draggable={false}
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
                        className="p-2"
                        style={{
                          fontSize: `${element.fontSize}px`,
                          color: element.fontColor,
                          fontFamily: element.fontFamily,
                          textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        {element.content}
                      </div>
                    )}
                    {element.type === 'sticker' && (
                      <div 
                        className="flex items-center justify-center w-full h-full"
                        style={{ fontSize: `${element.fontSize}px` }}
                      >
                        {element.content}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Page Navigation */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4 page-nav">
          <div className="flex items-center justify-between nav-controls">
            <button
              onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
              disabled={currentPageIndex === 0}
              className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 nav-button"
            >
              ← Previous
            </button>

            <div className="flex gap-2 overflow-x-auto page-numbers">
              {pages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPageIndex(index)}
                  className={`w-10 h-10 rounded-lg flex-shrink-0 page-number ${
                    index === currentPageIndex 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
              
              {pages.length < 100 && (
                <button
                  onClick={addNewPage}
                  className="px-4 py-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 flex-shrink-0 add-page-button"
                >
                  + Add Page
                </button>
              )}
            </div>

            <button
              onClick={() => setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))}
              disabled={currentPageIndex === pages.length - 1}
              className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 nav-button"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between action-buttons">
          <button
            onClick={() => router.push(`/albums/${albumId}`)}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 cancel-button"
          >
            Cancel
          </button>
          
          <button
            onClick={updateAlbum}
            disabled={saving || !title.trim()}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 save-button"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Sticker Picker Modal */}
      {showStickerPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 modal-overlay">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6 modal-content sticker-modal">
            <h3 className="text-xl font-bold mb-4 modal-title">Choose a Sticker</h3>
            
            {Object.entries(STICKER_LIBRARY).map(([category, stickers]) => (
              <div key={category} className="mb-6 sticker-category">
                <h4 className="text-lg font-semibold mb-2 capitalize category-title">{category}</h4>
                <div className="grid grid-cols-8 md:grid-cols-12 gap-2 sticker-grid">
                  {stickers.map((sticker, i) => (
                    <button
                      key={`${category}-${i}`}
                      onClick={() => addSticker(sticker)}
                      className="text-2xl hover:scale-125 transition-transform p-2 sticker-button"
                    >
                      {sticker}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            
            <button
              onClick={() => setShowStickerPicker(false)}
              className="mt-4 px-4 py-2 bg-gray-200 rounded-lg w-full md:w-auto modal-close"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Text Editor Modal */}
      {showTextEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 modal-overlay">
          <div className="bg-white rounded-lg max-w-md w-full p-6 modal-content text-modal">
            <h3 className="text-xl font-bold mb-4 modal-title">Add Text</h3>
            
            <textarea
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              placeholder="Enter your text..."
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 text-textarea"
              rows={3}
            />
            
            <div className="grid grid-cols-3 gap-2 mb-4 text-controls">
              <div>
                <label className="block text-sm mb-1">Size</label>
                <input
                  type="number"
                  value={textStyle.fontSize}
                  onChange={(e) => setTextStyle({...textStyle, fontSize: parseInt(e.target.value)})}
                  min="12"
                  max="96"
                  className="w-full p-2 border rounded font-size-input"
                />
              </div>
              
              <div>
                <label className="block text-sm mb-1">Color</label>
                <input
                  type="color"
                  value={textStyle.fontColor}
                  onChange={(e) => setTextStyle({...textStyle, fontColor: e.target.value})}
                  className="w-full h-10 color-input"
                />
              </div>
              
              <div>
                <label className="block text-sm mb-1">Font</label>
                <select
                  value={textStyle.fontFamily}
                  onChange={(e) => setTextStyle({...textStyle, fontFamily: e.target.value})}
                  className="w-full p-2 border rounded font-select"
                >
                  <option value="Arial">Arial</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Times New Roman">Times</option>
                  <option value="Comic Sans MS">Comic Sans</option>
                  <option value="Courier New">Courier</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-2 modal-actions">
              <button
                onClick={() => setShowTextEditor(false)}
                className="flex-1 px-4 py-2 bg-gray-200 rounded-lg text-cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={addTextElement}
                disabled={!editingText.trim()}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg disabled:opacity-50 text-add-button"
              >
                Add Text
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Background Picker Modal */}
      {showBackgroundPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 modal-overlay">
          <div className="bg-white rounded-lg max-w-md w-full p-6 modal-content bg-modal">
            <h3 className="text-xl font-bold mb-4 modal-title">Choose Background</h3>
            
            <div className="grid grid-cols-4 gap-2 mb-4 bg-colors">
              {['#ffffff', '#f3f4f6', '#fef3c7', '#dbeafe', '#fce7f3', '#d1fae5', '#fee2e2', '#e0e7ff'].map(color => (
                <button
                  key={color}
                  onClick={() => changeBackground(color)}
                  className="h-16 rounded-lg border-2 border-gray-300 hover:scale-105 transition-transform bg-color-button"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            
            <input
              type="color"
              value={currentPage?.backgroundColor || '#ffffff'}
              onChange={(e) => changeBackground(e.target.value)}
              className="w-full h-10 mb-4 bg-color-picker"
            />
            
            <button
              onClick={() => setShowBackgroundPicker(false)}
              className="w-full px-4 py-2 bg-gray-200 rounded-lg modal-close"
            >
              Close
            </button>
          </div>
        </div>
      )}

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

        /* Mobile Optimizations */
        @media (max-width: 768px) {
          .edit-album-page {
            padding: 0.5rem;
          }

          .edit-container {
            padding: 0;
          }

          .edit-header {
            padding: 1rem;
            margin-bottom: 0.75rem;
          }

          .page-title {
            font-size: 1.5rem;
            margin-bottom: 1rem;
          }

          .title-input,
          .privacy-select,
          .description-textarea {
            font-size: 16px; /* Prevents iOS zoom */
            padding: 0.75rem;
          }

          .toolbar {
            padding: 0.75rem;
            margin-bottom: 0.75rem;
          }

          .toolbar-buttons {
            gap: 0.5rem;
          }

          .tool-button {
            flex: 1;
            min-width: calc(50% - 0.25rem);
            padding: 0.875rem 0.5rem;
            font-size: 13px;
            touch-action: manipulation;
            white-space: nowrap;
          }

          .template-select {
            width: 100%;
            padding: 0.875rem;
            font-size: 16px;
            touch-action: manipulation;
          }

          .delete-page-button {
            width: 100%;
            margin-left: 0;
            margin-top: 0.5rem;
            padding: 0.875rem;
            touch-action: manipulation;
          }

          .canvas-container {
            padding: 0.75rem;
            margin-bottom: 0.75rem;
          }

          .canvas-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .canvas-title {
            font-size: 1rem;
          }

          .delete-element-button {
            width: 100%;
            padding: 0.875rem;
            font-size: 14px;
            touch-action: manipulation;
          }

          .canvas {
            min-height: 350px !important;
            touch-action: none;
          }

          .empty-canvas p {
            font-size: 14px;
          }

          .empty-canvas p:first-child {
            font-size: 2rem;
          }

          .canvas-element {
            touch-action: none;
          }

          .page-nav {
            padding: 0.75rem;
            margin-bottom: 0.75rem;
          }

          .nav-controls {
            flex-direction: column;
            gap: 0.75rem;
          }

          .nav-button {
            width: 100%;
            padding: 0.875rem;
            font-size: 14px;
            touch-action: manipulation;
          }

          .page-numbers {
            width: 100%;
            justify-content: flex-start;
            padding: 0.5rem 0;
            -webkit-overflow-scrolling: touch;
          }

          .page-numbers::-webkit-scrollbar {
            height: 4px;
          }

          .page-number,
          .add-page-button {
            min-width: 40px;
            height: 40px;
            font-size: 14px;
            touch-action: manipulation;
          }

          .action-buttons {
            flex-direction: column;
            gap: 0.75rem;
          }

          .cancel-button,
          .save-button {
            width: 100%;
            padding: 1rem;
            font-size: 16px;
            touch-action: manipulation;
          }

          /* Modal styles */
          .modal-overlay {
            padding: 1rem;
          }

          .modal-content {
            max-height: 85vh;
            padding: 1rem;
          }

          .modal-title {
            font-size: 1.25rem;
          }

          .sticker-modal {
            padding: 1.5rem 1rem;
          }

          .sticker-grid {
            grid-template-columns: repeat(6, 1fr);
            gap: 0.5rem;
          }

          .sticker-button {
            font-size: 1.75rem;
            padding: 0.5rem;
            touch-action: manipulation;
          }

          .text-textarea {
            font-size: 16px;
            padding: 0.75rem;
          }

          .text-controls {
            gap: 0.5rem;
          }

          .text-controls input,
          .text-controls select {
            font-size: 14px;
            padding: 0.625rem;
          }

          .font-size-input {
            font-size: 16px !important;
          }

          .modal-actions button {
            padding: 0.875rem;
            font-size: 14px;
            touch-action: manipulation;
          }

          .bg-colors {
            grid-template-columns: repeat(4, 1fr);
          }

          .bg-color-button {
            height: 3.5rem;
            touch-action: manipulation;
          }

          .modal-close {
            padding: 0.875rem;
            font-size: 14px;
            touch-action: manipulation;
          }
        }

        /* Small mobile screens */
        @media (max-width: 480px) {
          .page-title {
            font-size: 1.25rem;
          }

          .tool-button {
            font-size: 12px;
            padding: 0.75rem 0.375rem;
          }

          .canvas {
            min-height: 300px !important;
          }

          .sticker-grid {
            grid-template-columns: repeat(5, 1fr);
          }

          .sticker-button {
            font-size: 1.5rem;
          }

          .bg-colors {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        /* Landscape mobile orientation */
        @media (max-width: 768px) and (orientation: landscape) {
          .canvas {
            min-height: 250px !important;
          }

          .modal-content {
            max-height: 90vh;
          }
        }
      `}</style>
    </div>
  );
}
