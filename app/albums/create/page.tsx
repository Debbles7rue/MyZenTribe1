// app/albums/create/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import FriendSelector from '@/components/FriendSelector';

// Import components
import { AlbumPage, AlbumElement } from '@/components/album/constants/scrapbookAssets';
import AlbumCanvas from '@/components/album/AlbumCanvas';
import StickySidebarToolbar from '@/components/album/StickySidebarToolbar';
import FramePicker from '@/components/album/modals/FramePicker';
import LabelEditor from '@/components/album/modals/LabelEditor';
import DecorationPicker from '@/components/album/modals/DecorationPicker';
import StickerPicker from '@/components/album/modals/StickerPicker';
import TextEditor from '@/components/album/modals/TextEditor';
import BackgroundPicker from '@/components/album/modals/BackgroundPicker';

export default function CreateAlbumPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Album metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'private' | 'public'>('private');
  const [collaborators, setCollaborators] = useState<string[]>([]);
  
  // Pages and elements
  const [pages, setPages] = useState<AlbumPage[]>([{
    id: 'page-1',
    elements: [],
    backgroundColor: '#ffffff',
    template: 'freeform'
  }]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  
  // Modal states
  const [showFramePicker, setShowFramePicker] = useState(false);
  const [showLabelEditor, setShowLabelEditor] = useState(false);
  const [showDecorationPicker, setShowDecorationPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);

  // Get user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

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
        
        const { data, error } = await supabase.storage
          .from('post-media')
          .upload(fileName, file);

        if (!error && data) {
          const { data: { publicUrl } } = supabase.storage
            .from('post-media')
            .getPublicUrl(fileName);

          const element: AlbumElement = {
            id: `element-${Date.now()}-${i}`,
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

      if (newElements.length > 0) {
        updatePageElements(currentPageIndex, [...currentPage.elements, ...newElements]);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload media. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  // Update element on a specific page
  function updateElement(pageIndex: number, elementId: string, updates: Partial<AlbumElement>) {
    const updatedPages = [...pages];
    const elementIndex = updatedPages[pageIndex].elements.findIndex(el => el.id === elementId);
    
    if (elementIndex !== -1) {
      updatedPages[pageIndex].elements[elementIndex] = {
        ...updatedPages[pageIndex].elements[elementIndex],
        ...updates
      };
      setPages(updatedPages);
    }
  }

  // Update all elements on a page
  function updatePageElements(pageIndex: number, elements: AlbumElement[]) {
    const updatedPages = [...pages];
    updatedPages[pageIndex].elements = elements;
    setPages(updatedPages);
  }

  // Add frame to selected photo
  function addFrame(frameStyle: string) {
    if (!selectedElement) return;
    
    const element = pages[currentPageIndex].elements.find(el => el.id === selectedElement);
    if (element && (element.type === 'photo' || element.type === 'frame')) {
      updateElement(currentPageIndex, selectedElement, {
        type: 'frame',
        frameStyle
      });
    }
  }

  // Add text
  function addText(text: string, style: { fontSize: number; fontColor: string; fontFamily: string }) {
    const element: AlbumElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      content: text,
      x: 30,
      y: 40,
      width: 30,
      height: 10,
      rotation: 0,
      zIndex: pages[currentPageIndex].elements.length,
      ...style
    };

    updatePageElements(currentPageIndex, [...pages[currentPageIndex].elements, element]);
  }

  // Add label
  function addLabel(text: string, labelStyle: string) {
    const element: AlbumElement = {
      id: `label-${Date.now()}`,
      type: 'label',
      content: text,
      x: 35,
      y: 45,
      width: 20,
      height: 8,
      rotation: 0,
      zIndex: pages[currentPageIndex].elements.length,
      labelStyle,
      fontSize: 18,
      fontColor: '#000000',
      fontFamily: 'Arial'
    };

    updatePageElements(currentPageIndex, [...pages[currentPageIndex].elements, element]);
  }

  // Add sticker
  function addSticker(emoji: string) {
    const element: AlbumElement = {
      id: `sticker-${Date.now()}`,
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

    updatePageElements(currentPageIndex, [...pages[currentPageIndex].elements, element]);
  }

  // Add decoration
  function addDecoration(decoration: string) {
    const element: AlbumElement = {
      id: `decoration-${Date.now()}`,
      type: 'decoration',
      content: decoration,
      x: 40 + Math.random() * 20,
      y: 40 + Math.random() * 20,
      width: decoration.includes('Washi Tape') ? 30 : 8,
      height: decoration.includes('Washi Tape') ? 3 : 8,
      rotation: 0,
      zIndex: pages[currentPageIndex].elements.length,
      decorationType: decoration,
      fontSize: 32
    };

    updatePageElements(currentPageIndex, [...pages[currentPageIndex].elements, element]);
  }

  // Delete selected element
  function deleteElement() {
    if (!selectedElement) return;
    
    const updatedElements = pages[currentPageIndex].elements.filter(el => el.id !== selectedElement);
    updatePageElements(currentPageIndex, updatedElements);
    setSelectedElement(null);
  }

  // Move element to another page
  function moveElementToPage(targetPageIndex: number) {
    if (!selectedElement || targetPageIndex === currentPageIndex) return;
    
    // Find and remove element from current page
    const element = pages[currentPageIndex].elements.find(el => el.id === selectedElement);
    if (!element) return;

    const updatedPages = [...pages];
    updatedPages[currentPageIndex].elements = updatedPages[currentPageIndex].elements.filter(
      el => el.id !== selectedElement
    );

    // Add to target page with adjusted zIndex
    updatedPages[targetPageIndex].elements.push({
      ...element,
      zIndex: updatedPages[targetPageIndex].elements.length
    });

    setPages(updatedPages);
    setCurrentPageIndex(targetPageIndex);
  }

  // Apply template
  function applyTemplate(template: string) {
    const updatedPages = [...pages];
    updatedPages[currentPageIndex].template = template;

    // Auto-arrange photos based on template
    const photos = updatedPages[currentPageIndex].elements.filter(el => el.type === 'photo' || el.type === 'frame');
    
    if (template === 'grid' && photos.length > 0) {
      photos.forEach((photo, i) => {
        if (i < 4) {
          photo.x = (i % 2) * 48 + 2;
          photo.y = Math.floor(i / 2) * 48 + 2;
          photo.width = 46;
          photo.height = 46;
        }
      });
    } else if (template === 'feature' && photos.length > 0) {
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
    }

    setPages(updatedPages);
  }

  // Change background
  function changeBackground(color: string) {
    const updatedPages = [...pages];
    updatedPages[currentPageIndex].backgroundColor = color;
    setPages(updatedPages);
  }

  // Add new page
  function addNewPage() {
    if (pages.length >= 100) {
      alert('Maximum 100 pages allowed');
      return;
    }
    
    setPages([...pages, {
      id: `page-${Date.now()}`,
      elements: [],
      backgroundColor: '#ffffff',
      template: 'freeform'
    }]);
    setCurrentPageIndex(pages.length);
  }

  // Save album
  async function saveAlbum() {
    if (!userId) {
      alert('You must be logged in to save an album');
      return;
    }

    if (!title.trim()) {
      alert('Please add a title');
      return;
    }

    if (pages[0].elements.length === 0) {
      alert('Please add at least one photo');
      return;
    }

    setSaving(true);

    try {
      // Find cover image
      let coverImage = null;
      for (const page of pages) {
        const photo = page.elements.find(el => el.type === 'photo' || el.type === 'frame');
        if (photo) {
          coverImage = photo.content;
          break;
        }
      }

      // Create album
      const { data: album, error: albumError } = await supabase
        .from('albums')
        .insert({
          title: title.trim(),
          description: description?.trim() || null,
          privacy,
          creator_id: userId,
          cover_image: coverImage,
          page_count: pages.length,
          status: 'published',
          published_at: new Date().toISOString()
        })
        .select()
        .single();

      if (albumError) throw new Error(`Failed to create album: ${albumError.message}`);
      if (!album) throw new Error('No album data returned');

      // Save pages and elements
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        
        const { data: savedPage, error: pageError } = await supabase
          .from('album_pages')
          .insert({
            album_id: album.id,
            page_number: i + 1,
            background_color: page.backgroundColor || '#ffffff',
            template: page.template || 'freeform'
          })
          .select()
          .single();

        if (pageError) throw pageError;

        if (page.elements.length > 0 && savedPage) {
          const elements = page.elements.map((el, index) => ({
            page_id: savedPage.id,
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

      // Add collaborators
      if (collaborators.length > 0) {
        const collabData = collaborators.map(friendId => ({
          album_id: album.id,
          user_id: friendId,
          can_edit: true,
          status: 'pending'
        }));

        await supabase.from('album_collaborators').insert(collabData);
      }

      alert(`Album "${title}" created successfully! ✨`);
      router.push('/profile');
      
    } catch (error: any) {
      console.error('Save failed:', error);
      alert(error.message || 'Failed to save album. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4">
      <div className="flex">
        {/* Sticky Sidebar Toolbar */}
        <StickySidebarToolbar
          currentTemplate={pages[currentPageIndex]?.template || 'freeform'}
          uploading={uploading}
          canDeletePage={pages.length > 1}
          onPhotoUpload={handleMediaUpload}
          onOpenFramePicker={() => setShowFramePicker(true)}
          onOpenTextEditor={() => setShowTextEditor(true)}
          onOpenLabelEditor={() => setShowLabelEditor(true)}
          onOpenStickerPicker={() => setShowStickerPicker(true)}
          onOpenDecorationPicker={() => setShowDecorationPicker(true)}
          onOpenBackgroundPicker={() => setShowBackgroundPicker(true)}
          onTemplateChange={applyTemplate}
          showDeletePage={false}
        />

        {/* Main Content */}
        <div className="flex-1 max-w-5xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              ✨ Create Scrapbook Album
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="private">Private (Only me & collaborators)</option>
                  <option value="public">Public (Friends can see)</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                rows={2}
                placeholder="Our amazing trip to the mountains..."
              />
            </div>

            <div className="mt-4">
              <FriendSelector
                value={collaborators}
                onChange={setCollaborators}
                multiple={true}
                label="Invite Friends to Collaborate"
                placeholder="Search friends to add as co-creators..."
              />
            </div>
          </div>

          {/* Canvas */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">📖 All Pages (Editing View)</h2>
              <div className="flex items-center gap-2">
                {selectedElement && (
                  <>
                    <button
                      onClick={deleteElement}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      🗑️ Delete
                    </button>
                    {pages.length > 1 && (
                      <select
                        onChange={(e) => moveElementToPage(parseInt(e.target.value))}
                        value={currentPageIndex}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value={currentPageIndex}>Move to page...</option>
                        {pages.map((_, index) => (
                          index !== currentPageIndex && (
                            <option key={index} value={index}>
                              Move to Page {index + 1}
                            </option>
                          )
                        ))}
                      </select>
                    )}
                  </>
                )}
              </div>
            </div>

            <AlbumCanvas
              pages={pages}
              currentPageIndex={currentPageIndex}
              selectedElement={selectedElement}
              onSelectElement={setSelectedElement}
              onUpdateElement={updateElement}
              onSetCurrentPage={setCurrentPageIndex}
              isEditMode={true}
              showAllPages={true}
            />

            {/* Add New Page Button */}
            {pages.length < 100 && (
              <button
                onClick={addNewPage}
                className="w-full mt-8 py-8 border-4 border-dashed border-purple-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
              >
                <span className="text-2xl">➕ Add New Page</span>
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between mb-8">
            <button
              onClick={() => router.push('/profile')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={saveAlbum}
              disabled={saving || !title.trim() || pages[0].elements.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {saving ? '⏳ Creating...' : '✨ Create Scrapbook Album'}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <FramePicker
        isOpen={showFramePicker}
        selectedElementId={selectedElement}
        onClose={() => setShowFramePicker(false)}
        onApply={addFrame}
      />

      <LabelEditor
        isOpen={showLabelEditor}
        onClose={() => setShowLabelEditor(false)}
        onAdd={addLabel}
      />

      <DecorationPicker
        isOpen={showDecorationPicker}
        onClose={() => setShowDecorationPicker(false)}
        onAdd={addDecoration}
      />

      <StickerPicker
        isOpen={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onAdd={addSticker}
      />

      <TextEditor
        isOpen={showTextEditor}
        onClose={() => setShowTextEditor(false)}
        onAdd={addText}
      />

      <BackgroundPicker
        isOpen={showBackgroundPicker}
        currentColor={pages[currentPageIndex]?.backgroundColor || '#ffffff'}
        onClose={() => setShowBackgroundPicker(false)}
        onChange={changeBackground}
      />
    </div>
  );
}
