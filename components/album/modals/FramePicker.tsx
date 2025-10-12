// components/album/modals/FramePicker.tsx
"use client";

import React, { useState } from 'react';
import { FRAME_STYLES } from '../constants/scrapbookAssets';

type Props = {
  isOpen: boolean;
  selectedElementId: string | null;
  onClose: () => void;
  onApply: (frameStyle: string) => void;
};

export default function FramePicker({ isOpen, selectedElementId, onClose, onApply }: Props) {
  const [selectedStyle, setSelectedStyle] = useState('polaroid');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
        <h3 className="text-xl font-bold mb-4">🖼️ Choose a Frame Style</h3>
        
        <p className="text-sm text-gray-600 mb-4">
          {selectedElementId 
            ? 'Select a frame style for your photo' 
            : '⚠️ Please select a photo first, then choose a frame'}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {Object.entries(FRAME_STYLES).map(([key, style]) => (
            <button
              key={key}
              onClick={() => setSelectedStyle(key)}
              className={`p-4 border-2 rounded-lg hover:shadow-lg transition-all ${
                selectedStyle === key ? 'border-purple-500 bg-purple-50' : 'border-gray-300'
              }`}
            >
              <div className="text-3xl mb-2">{style.name.split(' ')[0]}</div>
              <div className="text-sm font-medium">{style.name.split(' ').slice(1).join(' ')}</div>
            </button>
          ))}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onApply(selectedStyle);
              onClose();
            }}
            disabled={!selectedElementId}
            className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-600 transition-colors"
          >
            Apply Frame
          </button>
        </div>
      </div>
    </div>
  );
}
