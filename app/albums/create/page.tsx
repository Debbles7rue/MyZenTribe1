// app/albums/create/page.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import FriendSelector from '@/components/FriendSelector';
import { debounce } from 'lodash';

// Types matching your original file
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
  elements: AlbumElement[];
  background: string;
  template?: string;
};

export default function CreateAlbumPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  
  // Album state from your original file
  const [pages, setPages] = useState<AlbumPage[]>([{
    id: '1',
    elements: [],
    background: '#ffffff',
    template: 'freeform'
  }]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'private' | 'public'>('private');
  const [saving, setSaving] = useState(false);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [editingText, setEditingText] = useState('');
  const [textStyle, setTextStyle] = useState({
    fontSize: 24,
    fontColor: '#000000',
    fontFamily: 'Arial'
  });

  // Template layouts from your original
  const templates = [
    { name: 'Classic Grid', slots: 4, layout: '2x2' },
    { name: 'Feature', slots: 3, layout: '1-big-2-small' },
    { name: 'Mosaic', slots: 6, layout: 'mosaic' },
    { name: 'Freeform', slots: 0, layout: 'free' }
  ];

  // Stickers
  const stickers = [
    { id: 'heart', emoji: '❤️' },
    { id: 'star', emoji: '⭐' },
    { id: 'sun', emoji: '☀️' },
    { id: 'rainbow', emoji: '🌈' },
    { id: 'fire', emoji: '🔥' }
  ];

  // Touch sensors for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 }
    })
  );

  // Get user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Auto-save with debounce
  const autoSave = useCallback(
    debounce(async () => {
      if (!title || pages[0].elements.length === 0) return;
      // Auto-save logic here if needed
      console.log('Auto-saving...');
    }, 2000),
    [title, pages]
  );

  useEffect(() => {
    autoSave();
  }, [pages, autoSave]);

  // Handle photo/video upload
  async function handleMediaUpload(files: FileList) {
    const currentPageData = pages[currentPage];
    const newElements: AlbumElement[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `albums/${userId}/${Date.now()}-${i}.${fileExt}`;

      try {
        // Upload to your existing bucket
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
            x: 10 + (i * 10) % 60,
            y: 10 + Math.floor(i / 4) * 20,
            width: 30,
            height: 30,
            rotation: 0,
            zIndex: currentPageData.elements.length + i
          };
          
          newElements.push(element);
        }
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }

    // Add elements to current page
    const updatedPages = [...pages];
    updatedPages[currentPage].elements.push(...newElements);
    setPages(updatedPages);
  }

  // Add text element
  function addTextElement() {
    if (!editingText.trim()) return;

    const element: AlbumElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      content: editingText,
      x: 30,
      y: 40,
      width: 40,
      height: 10,
      rotation: 0,
      zIndex: pages[currentPage].elements.length,
      ...textStyle
    };

    const updatedPages = [...pages];
    updatedPages[currentPage].elements.push(element);
    setPages(updatedPages);
    setShowTextEditor(false);
    setEditingText('');
  }

  // Add sticker
  function addSticker(emoji: string) {
    const element: AlbumElement = {
      id: `sticker-${Date.now()}`,
      type: 'sticker',
      content: emoji,
      x: Math.random() * 60 + 20,
      y: Math.random() * 60 + 20,
      width: 15,
      height: 15,
      rotation: 0,
      zIndex: pages[currentPage].elements.length,
      fontSize: 48
    };

    const updatedPages = [...pages];
    updatedPages[currentPage].elements.push(element);
    setPages(updatedPages);
  }

  // Handle drag end
  function handleDragEnd(event: DragEndEvent) {
    const { active, delta } = event;
    const elementId = active.id as string;

    const updatedPages = [...pages];
    const element = updatedPages[currentPage].elements.find(el => el.id === elementId);

    if (element) {
      element.x = Math.max(0, Math.min(70, element.x + (delta.x / 10)));
      element.y = Math.max(0, Math.min(70, element.y + (delta.y / 10)));
      setPages(updatedPages);
    }
  }

  // Delete selected element
  function deleteSelectedElement() {
    if (!selectedElement) return;

    const updatedPages = [...pages];
    updatedPages[currentPage].elements = updatedPages[currentPage].elements
      .filter(el => el.id !== selectedElement);
    setPages(updatedPages);
    setSelectedElement(null);
  }

  // Save album to database
  async function saveAlbum() {
    if (!title || pages[0].elements.length === 0) {
      alert('Please add a title and at least one photo');
      return;
    }

    setSaving(true);
    try {
      // Create album
      const { data: album, error } = await supabase
        .from('albums')
        .insert({
          title,
          description,
          privacy,
          creator_id: userId,
          cover_image: pages[0].elements[0]?.content,
          page_count: pages.length,
          status: 'published',
          published_at: new Date().toISOString()
        })
        .select()
        .single();

      if (!error && album) {
        // Save pages
        for (let i = 0; i < pages.length; i++) {
          const { data: page } = await supabase
            .from('album_pages')
            .insert({
              album_id: album.id,
              page_number: i + 1,
              background_color: pages[i].background
            })
            .select()
            .single();

          if (page && pages[i].elements.length > 0) {
            // Save elements
            const elements = pages[i].elements.map(el => ({
              page_id: page.id,
              type: el.type,
              content: el.content,
              position_x: el.x,
              position_y: el.y,
              width: el.width,
              height: el.height,
              rotation: el.rotation,
              z_index: el.zIndex,
              font_size: el.fontSize,
              font_color: el.fontColor,
              font_family: el.fontFamily
            }));

            await supabase.from('album_elements').insert(elements);
          }
        }

        // Add collaborators
        if (collaborators.length > 0) {
          const collabData = collaborators.map(userId => ({
            album_id: album.id,
            user_id: userId,
            can_edit: true,
            status: 'pending'
          }));
          
          await supabase.from('album_collaborators').insert(collabData);
        }

        alert('Album created successfully!');
        router.push('/profile');
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save album. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="album-creator">
      {/* Toolbar */}
      <div className="toolbar">
        <input
          type="text"
          placeholder="Album Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="title-input"
        />
        
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="description-input"
          rows={1}
        />
        
        <div className="tool-buttons">
          <label className="tool-btn">
            📷 Add Photos
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => e.target.files && handleMediaUpload(e.target.files)}
              style={{ display: 'none' }}
            />
          </label>
          
          <button className="tool-btn" onClick={() => setShowTextEditor(true)}>
            📝 Add Text
          </button>
          
          <div className="sticker-dropdown">
            <button className="tool-btn">✨ Stickers</button>
            <div className="sticker-options">
              {stickers.map(sticker => (
                <button
                  key={sticker.id}
                  onClick={() => addSticker(sticker.emoji)}
                  className="sticker-btn"
                >
                  {sticker.emoji}
                </button>
              ))}
            </div>
          </div>
          
          <button className="tool-btn" onClick={() => {
            const colors = ['#ffffff', '#f3f4f6', '#fef3c7', '#dbeafe', '#fce7f3'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            const updatedPages = [...pages];
            updatedPages[currentPage].background = randomColor;
            setPages(updatedPages);
          }}>
            🎨 Background
          </button>
        </div>

        <select 
          className="template-select"
          value={pages[currentPage].template}
          onChange={(e) => {
            const updatedPages = [...pages];
            updatedPages[currentPage].template = e.target.value;
            setPages(updatedPages);
          }}
        >
          {templates.map(t => (
            <option key={t.name} value={t.layout}>
              {t.name}
            </option>
          ))}
        </select>

        <select
          value={privacy}
          onChange={(e) => setPrivacy(e.target.value as any)}
          className="privacy-select"
        >
          <option value="private">🔒 Private</option>
          <option value="public">🌍 Public</option>
        </select>
      </div>

      {/* Canvas Area */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd} modifiers={[restrictToParentElement]}>
        <div className="album-canvas" style={{ background: pages[currentPage].background }}>
          <div className="page-container">
            {pages[currentPage].elements.map(element => (
              <div
                key={element.id}
                className={`element ${selectedElement === element.id ? 'selected' : ''}`}
                style={{
                  position: 'absolute',
                  left: `${element.x}%`,
                  top: `${element.y}%`,
                  width: `${element.width}%`,
                  height: `${element.height}%`,
                  transform: `rotate(${element.rotation}deg)`,
                  zIndex: element.zIndex,
                  cursor: 'move'
                }}
                onClick={() => setSelectedElement(element.id)}
              >
                {element.type === 'photo' && (
                  <img src={element.content} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                )}
                {element.type === 'video' && (
                  <video src={element.content} controls style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                )}
                {element.type === 'text' && (
                  <div style={{ 
                    fontSize: `${element.fontSize}px`, 
                    color: element.fontColor,
                    fontFamily: element.fontFamily 
                  }}>
                    {element.content}
                  </div>
                )}
                {element.type === 'sticker' && (
                  <div style={{ fontSize: `${element.fontSize}px` }}>{element.content}</div>
                )}
              </div>
            ))}
            
            {selectedElement && (
              <button
                onClick={deleteSelectedElement}
                className="delete-btn"
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  zIndex: 1000
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>
      </DndContext>

      {/* Collaborators */}
      <div className="collaborators-section">
        <FriendSelector
          value={collaborators}
          onChange={setCollaborators}
          multiple={true}
          label="Invite Friends to Collaborate"
          placeholder="Search friends to add as co-creators..."
        />
      </div>

      {/* Page Navigation */}
      <div className="page-nav">
        <button onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}>
          ← Previous
        </button>
        <span>Page {currentPage + 1} of {pages.length}</span>
        <button onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))}>
          Next →
        </button>
        <button onClick={() => {
          if (pages.length < 100) {
            setPages([...pages, {
              id: String(pages.length + 1),
              elements: [],
              background: '#ffffff'
            }]);
          }
        }}>
          + Add Page
        </button>
      </div>

      {/* Save Button */}
      <button 
        className="save-btn"
        onClick={saveAlbum}
        disabled={saving || !title || pages[0].elements.length === 0}
      >
        {saving ? 'Saving...' : 'Create Album'}
      </button>

      {/* Text Editor Modal */}
      {showTextEditor && (
        <div className="modal">
          <div className="modal-content">
            <h3>Add Text</h3>
            <textarea
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              placeholder="Enter your text..."
              className="text-input"
            />
            <div className="text-controls">
              <input
                type="number"
                value={textStyle.fontSize}
                onChange={(e) => setTextStyle({...textStyle, fontSize: parseInt(e.target.value)})}
                min="12"
                max="96"
              />
              <input
                type="color"
                value={textStyle.fontColor}
                onChange={(e) => setTextStyle({...textStyle, fontColor: e.target.value})}
              />
              <select
                value={textStyle.fontFamily}
                onChange={(e) => setTextStyle({...textStyle, fontFamily: e.target.value})}
              >
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Comic Sans MS">Comic Sans MS</option>
              </select>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowTextEditor(false)}>Cancel</button>
              <button onClick={addTextElement}>Add Text</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .album-creator {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem;
        }

        .toolbar {
          background: white;
          border-radius: 0.75rem;
          padding: 1rem;
          margin-bottom: 1rem;
          display: flex;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .title-input, .description-input {
          flex: 1;
          min-width: 200px;
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
        }

        .tool-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .tool-btn {
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .tool-btn:hover {
          transform: scale(1.05);
        }

        .sticker-dropdown {
          position: relative;
        }

        .sticker-options {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          padding: 0.5rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          z-index: 100;
        }

        .sticker-dropdown:hover .sticker-options {
          display: flex;
          gap: 0.25rem;
        }

        .sticker-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .sticker-btn:hover {
          transform: scale(1.2);
        }

        .template-select, .privacy-select {
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          background: white;
        }

        .album-canvas {
          background: white;
          border-radius: 0.75rem;
          padding: 2rem;
          min-height: 600px;
          position: relative;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .page-container {
          width: 100%;
          height: 600px;
          border: 2px dashed #e5e7eb;
          position: relative;
          overflow: hidden;
        }

        .element {
          cursor: move;
          border: 2px solid transparent;
          transition: border-color 0.2s;
        }

        .element.selected {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }

        .collaborators-section {
          background: white;
          border-radius: 0.75rem;
          padding: 1rem;
          margin: 1rem 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .page-nav {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin: 1rem 0;
          padding: 1rem;
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .page-nav button {
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
        }

        .page-nav button:hover {
          background: #e5e7eb;
        }

        .save-btn {
          display: block;
          margin: 2rem auto;
          padding: 0.75rem 2rem;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .save-btn:hover:not(:disabled) {
          transform: scale(1.05);
        }

        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 0.75rem;
          max-width: 500px;
          width: 90%;
        }

        .modal-content h3 {
          margin-top: 0;
        }

        .text-input {
          width: 100%;
          min-height: 100px;
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          margin: 1rem 0;
        }

        .text-controls {
          display: flex;
          gap: 0.5rem;
          margin: 1rem 0;
        }

        .text-controls input, .text-controls select {
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .modal-actions button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
        }

        .modal-actions button:first-child {
          background: #f3f4f6;
        }

        .modal-actions button:last-child {
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          color: white;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .tool-buttons {
            justify-content: center;
          }

          .tool-btn {
            flex: 1;
            min-width: 100px;
            font-size: 0.875rem;
          }

          .album-canvas {
            padding: 1rem;
          }

          .page-container {
            height: 400px;
          }
        }
      `}</style>
    </div>
  );
}
