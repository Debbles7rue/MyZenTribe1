// components/album/modals/TextEditor.tsx
"use client";

import React, { useState } from 'react';
import { FONT_FAMILIES } from '../constants/scrapbookAssets';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (text: string, style: { fontSize: number; fontColor: string; fontFamily: string }) => void;
};

export default function TextEditor({ isOpen, onClose, onAdd }: Props) {
  const [text, setText] = useState('');
  const [style, setStyle] = useState({
    fontSize: 24,
    fontColor: '#000000',
    fontFamily: 'Arial'
  });

  if (!isOpen) return null;

  const handleAdd = () => {
    if (text.trim()) {
      onAdd(text.trim(), style);
      setText('');
      setStyle({ fontSize: 24, fontColor: '#000000', fontFamily: 'Arial' });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-bold mb-4">📝 Add Text</h3>
        
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your text... (captions, dates, quotes, etc.)"
          className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          rows={3}
          maxLength={200}
          style={{
            fontSize: `${Math.min(style.fontSize, 20)}px`,
            fontFamily: style.fontFamily,
            color: style.fontColor
          }}
        />

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Preview</label>
          <div 
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-center min-h-[60px] flex items-center justify-center"
            style={{
              fontSize: `${style.fontSize}px`,
              fontFamily: style.fontFamily,
              color: style.fontColor
            }}
          >
            {text || 'Your text will appear here'}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Size</label>
            <input
              type="number"
              value={style.fontSize}
              onChange={(e) => setStyle({...style, fontSize: parseInt(e.target.value) || 24})}
              min="12"
              max="96"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Color</label>
            <input
              type="color"
              value={style.fontColor}
              onChange={(e) => setStyle({...style, fontColor: e.target.value})}
              className="w-full h-10 rounded border border-gray-300 cursor-pointer"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Font</label>
            <select
              value={style.fontFamily}
              onChange={(e) => setStyle({...style, fontFamily: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {FONT_FAMILIES.map(font => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-4">
          ✨ Text can be moved and resized after adding!
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!text.trim()}
            className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-600 transition-colors"
          >
            Add Text
          </button>
        </div>
      </div>
    </div>
  );
}
