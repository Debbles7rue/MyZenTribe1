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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6">
        <h3 className="text-xl font-bold mb-4">🖼️ Choose a Frame Style</h3>
        
        <p className="text-sm text-gray-600 mb-4">
          {selectedElementId 
            ? 'Select a frame style or shape crop for your photo' 
            : '⚠️ Please select a photo first, then choose a frame'}
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('decorative')}
            className={`px-4 py-2 font-semibold transition-all ${
              activeTab === 'decorative'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🎨 Decorative Frames ({decorativeFrames.length})
          </button>
          <button
            onClick={() => setActiveTab('shape')}
            className={`px-4 py-2 font-semibold transition-all ${
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {decorativeFrames.map(([key, style]) => (
              <button
                key={key}
                onClick={() => setSelectedStyle(key)}
                className={`p-4 border-2 rounded-lg hover:shadow-lg transition-all ${
                  selectedStyle === key ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' : 'border-gray-300'
                }`}
              >
                <div className="text-3xl mb-2">{style.name.split(' ')[0]}</div>
                <div className="text-xs font-medium text-gray-700">{style.name.split(' ').slice(1).join(' ')}</div>
              </button>
            ))}
          </div>
        )}

        {/* Shape Crops */}
        {activeTab === 'shape' && (
          <>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                ✨ <strong>Shape Crops:</strong> These cut your photo into fun shapes! Perfect for profile pics and creative layouts.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {shapeFrames.map(([key, style]) => (
                <button
                  key={key}
                  onClick={() => setSelectedStyle(key)}
                  className={`p-4 border-2 rounded-lg hover:shadow-lg transition-all ${
                    selectedStyle === key ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' : 'border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{style.name.split(' ')[0]}</div>
                  <div className="text-xs font-medium text-gray-700">{style.name.split(' ').slice(1).join(' ')}</div>
                </button>
              ))}
            </div>
          </>
        )}
        
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
            Apply {activeTab === 'shape' ? 'Shape' : 'Frame'}
          </button>
        </div>
      </div>
    </div>
  );
}
