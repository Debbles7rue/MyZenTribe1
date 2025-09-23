// components/AlbumCreator.tsx
"use client";

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

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
};

type AlbumPage = {
  id: string;
  elements: AlbumElement[];
  background: string;
  template?: string;
};

export default function AlbumCreator() {
  const [pages, setPages] = useState<AlbumPage[]>([{
    id: '1',
    elements: [],
    background: '#ffffff'
  }]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  // Template layouts
  const templates = [
    { name: 'Classic Grid', slots: 4, layout: '2x2' },
    { name: 'Feature', slots: 3, layout: '1-big-2-small' },
    { name: 'Mosaic', slots: 6, layout: 'mosaic' },
    { name: 'Freeform', slots: 0, layout: 'free' }
  ];

  async function handlePhotoUpload(files: FileList) {
    // Upload logic similar to PostComposer
    // Then add to current page as elements
  }

  async function saveAlbum() {
    setSaving(true);
    try {
      // Save to new albums table
      const { data: album, error } = await supabase
        .from('albums')
        .insert({
          title,
          cover_image: pages[0].elements[0]?.content,
          page_count: pages.length,
          is_public: true
        })
        .select()
        .single();

      if (!error && album) {
        // Save pages and elements
        for (let i = 0; i < pages.length; i++) {
          const { data: page } = await supabase
            .from('album_pages')
            .insert({
              album_id: album.id,
              page_number: i,
              background: pages[i].background
            })
            .select()
            .single();

          if (page) {
            // Save elements for this page
            const elements = pages[i].elements.map(el => ({
              page_id: page.id,
              type: el.type,
              content: el.content,
              position_x: el.x,
              position_y: el.y,
              width: el.width,
              height: el.height,
              rotation: el.rotation,
              z_index: el.zIndex
            }));

            await supabase.from('album_elements').insert(elements);
          }
        }
      }
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
        
        <div className="tool-buttons">
          <label className="tool-btn">
            📷 Add Photos
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)}
              style={{ display: 'none' }}
            />
          </label>
          
          <button className="tool-btn">📝 Add Text</button>
          <button className="tool-btn">✨ Stickers</button>
          <button className="tool-btn">🎨 Background</button>
        </div>

        <select className="template-select">
          {templates.map(t => (
            <option key={t.name} value={t.layout}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Canvas Area */}
      <div className="album-canvas">
        <div className="page-container">
          {/* This is where drag-drop library would render elements */}
          {pages[currentPage].elements.map(element => (
            <div
              key={element.id}
              className={`element ${selectedElement === element.id ? 'selected' : ''}`}
              style={{
                position: 'absolute',
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
                transform: `rotate(${element.rotation}deg)`,
                zIndex: element.zIndex
              }}
              onClick={() => setSelectedElement(element.id)}
            >
              {element.type === 'photo' && (
                <img src={element.content} alt="" />
              )}
              {element.type === 'text' && (
                <div>{element.content}</div>
              )}
            </div>
          ))}
        </div>
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
        <button onClick={() => setPages([...pages, {
          id: String(pages.length + 1),
          elements: [],
          background: '#ffffff'
        }])}>
          + Add Page
        </button>
      </div>

      {/* Save Button */}
      <button 
        className="save-btn"
        onClick={saveAlbum}
        disabled={saving || !title || pages[0].elements.length === 0}
      >
        {saving ? 'Saving...' : 'Save Album'}
      </button>

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
        }

        .title-input {
          flex: 1;
          min-width: 200px;
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
        }

        .tool-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .tool-btn {
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
        }

        .album-canvas {
          background: white;
          border-radius: 0.75rem;
          padding: 2rem;
          min-height: 600px;
          position: relative;
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
        }

        .element.selected {
          border-color: #3b82f6;
        }

        .page-nav {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin: 1rem 0;
        }

        .save-btn {
          display: block;
          margin: 2rem auto;
          padding: 0.75rem 2rem;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
        }

        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
