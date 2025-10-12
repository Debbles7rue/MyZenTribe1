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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 modal-overlay">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto p-6 modal-content">
        <h3 className="text-xl font-bold mb-4 modal-title">🎨 Choose Decorations</h3>
        
        <p className="text-sm text-gray-600 mb-4 modal-description">
          Add fun decorative elements to your scrapbook pages!
        </p>

        {Object.entries(DECORATIONS).map(([category, items]) => (
          <div key={category} className="mb-6 decoration-category">
            <h4 className="text-lg font-semibold mb-2 capitalize text-purple-600 category-title">
              {category === 'washiTape' && '🎀 Washi Tape'}
              {category === 'clips' && '📎 Clips & Pins'}
              {category === 'accents' && '✨ Accent Decorations'}
            </h4>
            <div className="grid grid-cols-2 gap-2 decoration-grid">
              {items.map((item, i) => (
                <button
                  key={`${category}-${i}`}
                  onClick={() => handleAdd(item)}
                  className="p-3 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left decoration-button"
                >
                  <span className="text-sm decoration-name">{item}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 tip-box">
          💡 <strong>Tip:</strong> All decorations can be resized and rotated after adding!
        </div>
        
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-200 rounded-lg w-full hover:bg-gray-300 transition-colors done-button"
        >
          Done
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

          .modal-title {
            font-size: 1.25rem;
            margin-bottom: 0.875rem;
          }

          .modal-description {
            font-size: 13px;
            margin-bottom: 1rem;
          }

          .decoration-category {
            margin-bottom: 1.25rem;
          }

          .category-title {
            font-size: 1rem;
            margin-bottom: 0.5rem;
          }

          .decoration-grid {
            gap: 0.5rem;
          }

          .decoration-button {
            padding: 0.875rem 0.75rem;
            touch-action: manipulation;
          }

          .decoration-name {
            font-size: 13px;
            line-height: 1.3;
          }

          .tip-box {
            margin-top: 1rem;
            padding: 0.75rem;
            font-size: 12px;
            line-height: 1.4;
          }

          .done-button {
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

          .modal-description {
            font-size: 12px;
          }

          .category-title {
            font-size: 0.9375rem;
          }

          .decoration-button {
            padding: 0.75rem 0.625rem;
          }

          .decoration-name {
            font-size: 12px;
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
          .decoration-button,
          .done-button {
            min-height: 44px;
          }
        }

        /* Landscape mobile orientation */
        @media (max-width: 768px) and (orientation: landscape) {
          .modal-content {
            max-height: 90vh;
          }
        }
      `}</style>
    </div>
  );
}
