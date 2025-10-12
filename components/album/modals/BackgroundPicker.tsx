// components/album/modals/BackgroundPicker.tsx
"use client";

import React, { useState } from 'react';
import { BACKGROUND_COLORS } from '../constants/scrapbookAssets';

type Props = {
  isOpen: boolean;
  currentColor: string;
  onClose: () => void;
  onChange: (color: string) => void;
};

export default function BackgroundPicker({ isOpen, currentColor, onClose, onChange }: Props) {
  const [customColor, setCustomColor] = useState(currentColor);

  if (!isOpen) return null;

  const handleColorSelect = (color: string) => {
    onChange(color);
    setCustomColor(color);
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    onChange(color);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 modal-overlay">
      <div className="bg-white rounded-lg max-w-md w-full p-6 modal-content">
        <h3 className="text-xl font-bold mb-4 modal-title">🎨 Choose Background Color</h3>
        
        <p className="text-sm text-gray-600 mb-4 modal-description">
          Select a preset color or choose your own custom color
        </p>

        {/* Preset Colors */}
        <div className="mb-4 preset-section">
          <label className="block text-sm font-medium mb-2 preset-label">Preset Colors</label>
          <div className="grid grid-cols-6 gap-2 preset-grid">
            {BACKGROUND_COLORS.map(color => (
              <button
                key={color}
                onClick={() => handleColorSelect(color)}
                className={`h-12 rounded-lg border-2 hover:scale-105 transition-transform preset-color ${
                  customColor === color ? 'border-purple-500 ring-2 ring-purple-300' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Custom Color Picker */}
        <div className="mb-4 custom-section">
          <label className="block text-sm font-medium mb-2 custom-label">Custom Color</label>
          <div className="flex gap-2 items-center custom-inputs">
            <input
              type="color"
              value={customColor}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              className="w-20 h-12 rounded border border-gray-300 cursor-pointer color-picker"
            />
            <input
              type="text"
              value={customColor}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm color-input"
              placeholder="#ffffff"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="mb-4 preview-section">
          <label className="block text-sm font-medium mb-2 preview-label">Preview</label>
          <div 
            className="h-24 rounded-lg border-2 border-gray-300 flex items-center justify-center text-gray-600 preview-box"
            style={{ backgroundColor: customColor }}
          >
            <span className="bg-white px-3 py-1 rounded shadow-sm text-sm preview-text">
              Page Background
            </span>
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-4 tip-text">
          💡 <strong>Tip:</strong> Light backgrounds work best for readability
        </div>
        
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors done-button"
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
            padding: 1.25rem;
            max-height: 90vh;
            overflow-y: auto;
          }

          .modal-title {
            font-size: 1.25rem;
            margin-bottom: 0.875rem;
          }

          .modal-description {
            font-size: 13px;
            margin-bottom: 1rem;
          }

          .preset-section {
            margin-bottom: 1rem;
          }

          .preset-label {
            font-size: 13px;
            margin-bottom: 0.5rem;
          }

          .preset-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 0.5rem;
          }

          .preset-color {
            height: 3rem;
            touch-action: manipulation;
          }

          .custom-section {
            margin-bottom: 1rem;
          }

          .custom-label {
            font-size: 13px;
            margin-bottom: 0.5rem;
          }

          .custom-inputs {
            gap: 0.5rem;
          }

          .color-picker {
            width: 4rem;
            height: 3rem;
            flex-shrink: 0;
          }

          .color-input {
            padding: 0.75rem;
            font-size: 14px;
          }

          .preview-section {
            margin-bottom: 1rem;
          }

          .preview-label {
            font-size: 13px;
            margin-bottom: 0.5rem;
          }

          .preview-box {
            height: 5rem;
          }

          .preview-text {
            font-size: 13px;
            padding: 0.5rem 0.75rem;
          }

          .tip-text {
            font-size: 11px;
            margin-bottom: 1rem;
            line-height: 1.4;
          }

          .done-button {
            padding: 0.875rem;
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

          .preset-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.375rem;
          }

          .preset-color {
            height: 2.75rem;
          }

          .color-picker {
            width: 3.5rem;
            height: 2.75rem;
          }

          .color-input {
            padding: 0.625rem;
            font-size: 13px;
          }

          .preview-box {
            height: 4.5rem;
          }

          .preview-text {
            font-size: 12px;
            padding: 0.375rem 0.625rem;
          }

          .tip-text {
            font-size: 10px;
          }

          .done-button {
            padding: 0.75rem;
            font-size: 13px;
          }
        }

        /* Better touch support */
        @media (hover: none) and (pointer: coarse) {
          .preset-color,
          .color-picker,
          .color-input,
          .done-button {
            min-height: 44px;
          }
        }
      `}</style>
    </div>
  );
}
