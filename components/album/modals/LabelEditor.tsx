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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 modal-overlay">
      <div className="bg-white rounded-lg max-w-md w-full p-6 modal-content">
        <h3 className="text-xl font-bold mb-4 modal-title">🏷️ Add a Label</h3>
        
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter label text... (e.g., 'Summer 2024', 'Best Friends', 'Adventure Time!')"
          className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-purple-500 focus:border-transparent label-textarea"
          rows={2}
          maxLength={50}
        />

        <div className="mb-4 style-section">
          <label className="block text-sm font-medium mb-2 style-label">Label Style</label>
          <div className="grid grid-cols-2 gap-2 style-grid">
            {Object.entries(LABEL_STYLES).map(([key, style]) => (
              <button
                key={key}
                onClick={() => setSelectedStyle(key)}
                className={`p-3 border-2 rounded-lg text-sm transition-all style-button ${
                  selectedStyle === key 
                    ? 'border-purple-500 bg-purple-50 shadow-md' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{
                  backgroundColor: selectedStyle === key ? undefined : style.bg
                }}
              >
                <div className="font-semibold style-name">{style.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-4 helper-text">
          ✨ Labels can be resized after adding! Click and drag the corners.
        </div>
        
        <div className="flex gap-2 action-buttons">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors cancel-button"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!text.trim()}
            className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-600 transition-colors add-button"
          >
            Add Label
          </button>
        </div>
      </div>

      <style jsx>{`
        /* Mobile Optimizations */
        @media (max-width: 768px) {
          .modal-overlay {
            padding: 1rem;
          }

          .modal-content {
            padding: 1.25rem;
            max-height: 90vh;
            overflow-y: auto;
          }

          .modal-title {
            font-size: 1.25rem;
            margin-bottom: 0.875rem;
          }

          .label-textarea {
            padding: 0.75rem;
            font-size: 16px; /* Prevents iOS zoom */
            margin-bottom: 1rem;
          }

          .style-section {
            margin-bottom: 1rem;
          }

          .style-label {
            font-size: 13px;
            margin-bottom: 0.5rem;
          }

          .style-grid {
            gap: 0.5rem;
          }

          .style-button {
            padding: 0.875rem 0.75rem;
            font-size: 13px;
            touch-action: manipulation;
          }

          .style-name {
            font-size: 13px;
          }

          .helper-text {
            font-size: 11px;
            margin-bottom: 1rem;
            line-height: 1.4;
          }

          .action-buttons {
            gap: 0.5rem;
          }

          .cancel-button,
          .add-button {
            padding: 0.875rem 1rem;
            font-size: 14px;
            touch-action: manipulation;
          }
        }

        /* Small mobile screens */
        @media (max-width: 480px) {
          .modal-content {
            padding: 1rem;
          }

          .modal-title {
            font-size: 1.125rem;
          }

          .label-textarea {
            padding: 0.625rem;
            font-size: 16px;
          }

          .style-button {
            padding: 0.75rem 0.5rem;
            font-size: 12px;
          }

          .style-name {
            font-size: 12px;
          }

          .helper-text {
            font-size: 10px;
          }

          .cancel-button,
          .add-button {
            padding: 0.75rem;
            font-size: 13px;
          }
        }

        /* Better touch support */
        @media (hover: none) and (pointer: coarse) {
          .style-button,
          .cancel-button,
          .add-button {
            min-height: 44px;
          }
        }
      `}</style>
    </div>
  );
}
