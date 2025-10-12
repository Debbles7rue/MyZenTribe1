// components/album/modals/LabelEditor.tsx
"use client";

import React, { useState } from 'react';
import { LABEL_STYLES } from '../constants/scrapbookAssets';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (text: string, style: string) => void;
};

export default function LabelEditor({ isOpen, onClose, onAdd }: Props) {
  const [text, setText] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('tag');

  if (!isOpen) return null;

  const handleAdd = () => {
    if (text.trim()) {
      onAdd(text.trim(), selectedStyle);
      setText('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-bold mb-4">🏷️ Add a Label</h3>
        
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter label text... (e.g., 'Summer 2024', 'Best Friends', 'Adventure Time!')"
          className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          rows={2}
          maxLength={50}
        />

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Label Style</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(LABEL_STYLES).map(([key, style]) => (
              <button
                key={key}
                onClick={() => setSelectedStyle(key)}
                className={`p-3 border-2 rounded-lg text-sm transition-all ${
                  selectedStyle === key 
                    ? 'border-purple-500 bg-purple-50 shadow-md' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{
                  backgroundColor: selectedStyle === key ? undefined : style.bg
                }}
              >
                <div className="font-semibold">{style.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-4">
          ✨ Labels can be resized after adding! Click and drag the corners.
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
            Add Label
          </button>
        </div>
      </div>
    </div>
  );
}
