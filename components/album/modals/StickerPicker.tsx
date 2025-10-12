// components/album/modals/StickerPicker.tsx
"use client";

import React, { useState } from 'react';
import { STICKER_LIBRARY } from '../constants/scrapbookAssets';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (emoji: string) => void;
};

export default function StickerPicker({ isOpen, onClose, onAdd }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const handleAdd = (emoji: string) => {
    onAdd(emoji);
    // Don't close - let users add multiple stickers
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">✨ Choose Stickers</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <input
          type="text"
          placeholder="Search stickers by category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        
        {Object.entries(STICKER_LIBRARY)
          .filter(([category]) => 
            searchTerm === '' || category.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map(([category, stickers]) => (
            <div key={category} className="mb-6">
              <h4 className="text-lg font-semibold mb-2 capitalize text-purple-600">
                {category === 'emotions' && '😊 Emotions & Faces'}
                {category === 'hearts' && '💕 Hearts & Love'}
                {category === 'celebration' && '🎉 Celebration'}
                {category === 'nature' && '🌸 Nature'}
                {category === 'animals' && '🐶 Animals'}
                {category === 'food' && '🍕 Food & Drinks'}
              </h4>
              <div className="grid grid-cols-8 md:grid-cols-12 gap-2">
                {stickers.map((sticker, i) => (
                  <button
                    key={`${category}-${i}`}
                    onClick={() => handleAdd(sticker)}
                    className="text-3xl hover:scale-125 transition-transform p-2 hover:bg-purple-50 rounded"
                    title={`Add ${sticker}`}
                  >
                    {sticker}
                  </button>
                ))}
              </div>
            </div>
          ))}

        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800">
          💡 <strong>Pro Tip:</strong> Stickers can be resized after adding! Click to select, then drag the corners.
        </div>
        
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-200 rounded-lg w-full md:w-auto hover:bg-gray-300 transition-colors"
        >
          Done Adding Stickers
        </button>
      </div>
    </div>
  );
}
