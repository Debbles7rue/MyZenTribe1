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
  const [activeTab, setActiveTab] = useState<'decorative' | 'shape'>('decorative');

  if (!isOpen) return null;

  const decorativeFrames = Object.entries(FRAME_STYLES).filter(([_, style]) => style.category === 'decorative');
  const shapeFrames = Object.entries(FRAME_STYLES).filter(([_, style]) => style.category === 'shape');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 modal-overlay">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 modal-content">
        <h3 className="text-xl font-bold mb-4 modal-title">🖼️ Choose a Frame Style</h3>
        
        <p className="text-sm text-gray-600 mb-4 modal-description">
          {selectedElementId 
            ? 'Select a frame style or shape crop for your photo' 
            : '⚠️ Please select a photo first, then choose a frame'}
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 tabs-container">
          <button
            onClick={() => setActiveTab('decorative')}
            className={`px-4 py-2 font-semibold transition-all tab-button ${
              activeTab === 'decorative'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🎨 Decorative Frames ({decorativeFrames.length})
          </button>
          <button
            onClick={() => setActiveTab('shape')}
            className={`px-4 py-2 font-semibold transition-all tab-button ${
              activeTab === 'shape'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ⭐ Shape Crops ({shapeFrames.length})
          </button>
        </div>

        {/* Decorative Frames */}
        {activeTab === 'decorative' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 frames-grid">
            {decorativeFrames.map(([key, style]) => (
              <button
                key={key}
                onClick={() => setSelectedStyle(key)}
                className={`p-4 border-2 rounded-lg hover:shadow-lg transition-all frame-option ${
                  selectedStyle === key ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' : 'border-gray-300'
                }`}
              >
                <div className="text-3xl mb-2 frame-emoji">{style.name.split(' ')[0]}</div>
                <div className="text-xs font-medium text-gray-700 frame-name">{style.name.split(' ').slice(1).join(' ')}</div>
              </button>
            ))}
          </div>
        )}

        {/* Shape Crops */}
        {activeTab === 'shape' && (
          <>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg shape-info">
              <p className="text-sm text-blue-800">
                ✨ <strong>Shape Crops:</strong> These cut your photo into fun shapes! Perfect for profile pics and creative layouts.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shapes-grid">
              {shapeFrames.map(([key, style]) => (
                <button
                  key={key}
                  onClick={() => setSelectedStyle(key)}
                  className={`p-4 border-2 rounded-lg hover:shadow-lg transition-all shape-option ${
                    selectedStyle === key ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' : 'border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2 shape-emoji">{style.name.split(' ')[0]}</div>
                  <div className="text-xs font-medium text-gray-700 shape-name">{style.name.split(' ').slice(1).join(' ')}</div>
                </button>
              ))}
            </div>
          </>
        )}
        
        <div className="flex gap-2 action-buttons">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors cancel-button"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onApply(selectedStyle);
              onClose();
            }}
            disabled={!selectedElementId}
            className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-600 transition-colors apply-button"
          >
            Apply {activeTab === 'shape' ? 'Shape' : 'Frame'}
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
            max-height: 90vh;
            padding: 1.25rem;
          }

          .modal-title {
            font-size: 1.25rem;
            margin-bottom: 0.75rem;
          }

          .modal-description {
            font-size: 13px;
            margin-bottom: 1rem;
          }

          .tabs-container {
            gap: 0.5rem;
            margin-bottom: 1.25rem;
          }

          .tab-button {
            flex: 1;
            padding: 0.75rem 0.5rem;
            font-size: 13px;
            text-align: center;
            white-space: nowrap;
            touch-action: manipulation;
          }

          .frames-grid,
          .shapes-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
            margin-bottom: 1.25rem;
          }

          .frame-option,
          .shape-option {
            padding: 0.875rem;
            touch-action: manipulation;
          }

          .frame-emoji,
          .shape-emoji {
            font-size: 2rem;
            margin-bottom: 0.5rem;
          }

          .frame-name,
          .shape-name {
            font-size: 11px;
            line-height: 1.3;
          }

          .shape-info {
            padding: 0.75rem;
            margin-bottom: 1rem;
          }

          .shape-info p {
            font-size: 12px;
            line-height: 1.4;
          }

          .action-buttons {
            gap: 0.5rem;
          }

          .cancel-button,
          .apply-button {
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

          .modal-description {
            font-size: 12px;
          }

          .tab-button {
            font-size: 12px;
            padding: 0.625rem 0.375rem;
          }

          .frames-grid,
          .shapes-grid {
            gap: 0.625rem;
          }

          .frame-option,
          .shape-option {
            padding: 0.75rem;
          }

          .frame-emoji,
          .shape-emoji {
            font-size: 1.75rem;
          }

          .frame-name,
          .shape-name {
            font-size: 10px;
          }

          .shape-info p {
            font-size: 11px;
          }

          .cancel-button,
          .apply-button {
            padding: 0.75rem;
            font-size: 13px;
          }
        }

        /* Better touch support */
        @media (hover: none) and (pointer: coarse) {
          .tab-button,
          .frame-option,
          .shape-option,
          .cancel-button,
          .apply-button {
            min-height: 44px;
          }
        }

        /* Landscape mobile orientation */
        @media (max-width: 768px) and (orientation: landscape) {
          .modal-content {
            max-height: 95vh;
          }

          .frames-grid,
          .shapes-grid {
            max-height: 50vh;
            overflow-y: auto;
          }
        }
      `}</style>
    </div>
  );
}
