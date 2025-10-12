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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 modal-overlay">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6 modal-content">
        <div className="flex items-center justify-between mb-4 modal-header">
          <h3 className="text-xl font-bold modal-title">✨ Choose Stickers</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl close-button"
          >
            ×
          </button>
        </div>

        <input
          type="text"
          placeholder="Search stickers by category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-purple-500 focus:border-transparent search-input"
        />
        
        {Object.entries(STICKER_LIBRARY)
          .filter(([category]) => 
            searchTerm === '' || category.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map(([category, stickers]) => (
            <div key={category} className="mb-6 sticker-category">
              <h4 className="text-lg font-semibold mb-2 capitalize text-purple-600 category-title">
                {category === 'emotions' && '😊 Emotions & Faces'}
                {category === 'hearts' && '💕 Hearts & Love'}
                {category === 'celebration' && '🎉 Celebration'}
                {category === 'nature' && '🌸 Nature'}
                {category === 'animals' && '🐶 Animals'}
                {category === 'food' && '🍕 Food & Drinks'}
              </h4>
              <div className="grid grid-cols-8 md:grid-cols-12 gap-2 sticker-grid">
                {stickers.map((sticker, i) => (
                  <button
                    key={`${category}-${i}`}
                    onClick={() => handleAdd(sticker)}
                    className="text-3xl hover:scale-125 transition-transform p-2 hover:bg-purple-50 rounded sticker-button"
                    title={`Add ${sticker}`}
                  >
                    {sticker}
                  </button>
                ))}
              </div>
            </div>
          ))}

        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800 tip-box">
          💡 <strong>Pro Tip:</strong> Stickers can be resized after adding! Click to select, then drag the corners.
        </div>
        
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-200 rounded-lg w-full md:w-auto hover:bg-gray-300 transition-colors done-button"
        >
          Done Adding Stickers
        </button>
      </div>

      <style jsx>{`
        /* Mobile Optimizations */
        @media (max-width: 768px) {
          .modal-overlay {
            padding: 1rem;
          }

          .modal-content {
            max-height: 85vh;
            padding: 1.25rem;
          }

          .modal-header {
            margin-bottom: 0.875rem;
          }

          .modal-title {
            font-size: 1.25rem;
          }

          .close-button {
            font-size: 2rem;
            padding: 0.25rem;
            min-width: 44px;
            min-height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            touch-action: manipulation;
          }

          .search-input {
            padding: 0.75rem;
            font-size: 16px; /* Prevents iOS zoom */
            margin-bottom: 1rem;
          }

          .sticker-category {
            margin-bottom: 1.25rem;
          }

          .category-title {
            font-size: 1rem;
            margin-bottom: 0.5rem;
          }

          .sticker-grid {
            grid-template-columns: repeat(6, 1fr);
            gap: 0.5rem;
          }

          .sticker-button {
            font-size: 2rem;
            padding: 0.5rem;
            touch-action: manipulation;
          }

          .tip-box {
            margin-top: 1rem;
            padding: 0.75rem;
            font-size: 12px;
            line-height: 1.4;
          }

          .done-button {
            width: 100%;
            margin-top: 1rem;
            padding: 0.875rem;
            font-size: 14px;
            touch-action: manipulation;
          }
        }

        /* Small mobile screens */
        @media (max-width: 480px) {
          .modal-content {
            padding: 1rem;
            max-height: 90vh;
          }

          .modal-title {
            font-size: 1.125rem;
          }

          .close-button {
            font-size: 1.75rem;
          }

          .search-input {
            padding: 0.625rem;
            font-size: 16px;
          }

          .category-title {
            font-size: 0.9375rem;
          }

          .sticker-grid {
            grid-template-columns: repeat(5, 1fr);
            gap: 0.375rem;
          }

          .sticker-button {
            font-size: 1.75rem;
            padding: 0.375rem;
          }

          .tip-box {
            padding: 0.625rem;
            font-size: 11px;
          }

          .done-button {
            padding: 0.75rem;
            font-size: 13px;
          }
        }

        /* Better touch support */
        @media (hover: none) and (pointer: coarse) {
          .sticker-button {
            min-width: 44px;
            min-height: 44px;
          }

          .done-button {
            min-height: 44px;
          }
        }

        /* Landscape mobile orientation */
        @media (max-width: 768px) and (orientation: landscape) {
          .modal-content {
            max-height: 90vh;
          }

          .sticker-grid {
            grid-template-columns: repeat(8, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
