// components/album/modals/DecorationPicker.tsx
"use client";

import React from 'react';
import { DECORATIONS } from '../constants/scrapbookAssets';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (decoration: string) => void;
};

export default function DecorationPicker({ isOpen, onClose, onAdd }: Props) {
  if (!isOpen) return null;

  const handleAdd = (decoration: string) => {
    onAdd(decoration);
    // Don't close automatically - let users add multiple decorations
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto p-6">
        <h3 className="text-xl font-bold mb-4">🎨 Choose Decorations</h3>
        
        <p className="text-sm text-gray-600 mb-4">
          Add fun decorative elements to your scrapbook pages!
        </p>

        {Object.entries(DECORATIONS).map(([category, items]) => (
          <div key={category} className="mb-6">
            <h4 className="text-lg font-semibold mb-2 capitalize text-purple-600">
              {category === 'washiTape' && '🎀 Washi Tape'}
              {category === 'clips' && '📎 Clips & Pins'}
              {category === 'accents' && '✨ Accent Decorations'}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {items.map((item, i) => (
                <button
                  key={`${category}-${i}`}
                  onClick={() => handleAdd(item)}
                  className="p-3 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                >
                  <span className="text-sm">{item}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          💡 <strong>Tip:</strong> All decorations can be resized and rotated after adding!
        </div>
        
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-200 rounded-lg w-full hover:bg-gray-300 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
