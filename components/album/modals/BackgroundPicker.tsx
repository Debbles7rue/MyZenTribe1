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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-bold mb-4">🎨 Choose Background Color</h3>
        
        <p className="text-sm text-gray-600 mb-4">
          Select a preset color or choose your own custom color
        </p>

        {/* Preset Colors */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Preset Colors</label>
          <div className="grid grid-cols-6 gap-2">
            {BACKGROUND_COLORS.map(color => (
              <button
                key={color}
                onClick={() => handleColorSelect(color)}
                className={`h-12 rounded-lg border-2 hover:scale-105 transition-transform ${
                  customColor === color ? 'border-purple-500 ring-2 ring-purple-300' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Custom Color Picker */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Custom Color</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={customColor}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              className="w-20 h-12 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={customColor}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
              placeholder="#ffffff"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Preview</label>
          <div 
            className="h-24 rounded-lg border-2 border-gray-300 flex items-center justify-center text-gray-600"
            style={{ backgroundColor: customColor }}
          >
            <span className="bg-white px-3 py-1 rounded shadow-sm text-sm">
              Page Background
            </span>
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-4">
          💡 <strong>Tip:</strong> Light backgrounds work best for readability
        </div>
        
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
