// components/album/modals/TextEditor.tsx
"use client";

import React, { useState } from 'react';
import { FONT_FAMILIES } from '../constants/scrapbookAssets';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (text: string, style: { fontSize: number; fontColor: string; fontFamily: string }) => void;
};

export default function TextEditor({ isOpen, onClose, onAdd }: Props) {
  const [text, setText] = useState('');
  const [style, setStyle] = useState({
    fontSize: 24,
    fontColor: '#000000',
    fontFamily: 'Arial'
  });

  if (!isOpen) return null;

  const handleAdd = () => {
    if (text.trim()) {
      onAdd(text.trim(), style);
      setText('');
      setStyle({ fontSize: 24, fontColor: '#000000', fontFamily: 'Arial' });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 modal-overlay">
      <div className="bg-white rounded-lg max-w-md w-full p-6 modal-content">
        <h3 className="text-xl font-bold mb-4 modal-title">📝 Add Text</h3>
        
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your text... (captions, dates, quotes, etc.)"
          className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-textarea"
          rows={3}
          maxLength={200}
          style={{
            fontSize: `${Math.min(style.fontSize, 20)}px`,
            fontFamily: style.fontFamily,
            color: style.fontColor
          }}
        />

        <div className="mb-4 preview-section">
          <label className="block text-sm font-medium mb-2 preview-label">Preview</label>
          <div 
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-center min-h-[60px] flex items-center justify-center preview-box"
            style={{
              fontSize: `${style.fontSize}px`,
              fontFamily: style.fontFamily,
              color: style.fontColor
            }}
          >
            {text || 'Your text will appear here'}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3 mb-4 controls-grid">
          <div className="control-item">
            <label className="block text-sm font-medium mb-1 control-label">Size</label>
            <input
              type="number"
              value={style.fontSize}
              onChange={(e) => setStyle({...style, fontSize: parseInt(e.target.value) || 24})}
              min="12"
              max="96"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent size-input"
            />
          </div>
          
          <div className="control-item">
            <label className="block text-sm font-medium mb-1 control-label">Color</label>
            <input
              type="color"
              value={style.fontColor}
              onChange={(e) => setStyle({...style, fontColor: e.target.value})}
              className="w-full h-10 rounded border border-gray-300 cursor-pointer color-input"
            />
          </div>
          
          <div className="control-item">
            <label className="block text-sm font-medium mb-1 control-label">Font</label>
            <select
              value={style.fontFamily}
              onChange={(e) => setStyle({...style, fontFamily: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent font-select"
            >
              {FONT_FAMILIES.map(font => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-4 helper-text">
          ✨ Text can be moved and resized after adding!
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
            Add Text
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

          .text-textarea {
            padding: 0.75rem;
            font-size: 16px; /* Prevents iOS zoom */
            margin-bottom: 1rem;
          }

          .preview-section {
            margin-bottom: 1rem;
          }

          .preview-label {
            font-size: 13px;
            margin-bottom: 0.5rem;
          }

          .preview-box {
            padding: 1rem;
            min-height: 50px;
          }

          .controls-grid {
            gap: 0.75rem;
            margin-bottom: 1rem;
          }

          .control-label {
            font-size: 12px;
            margin-bottom: 0.375rem;
          }

          .size-input,
          .font-select {
            padding: 0.625rem;
            font-size: 16px; /* Prevents iOS zoom */
          }

          .color-input {
            height: 2.5rem;
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

          .text-textarea {
            padding: 0.625rem;
            font-size: 16px;
          }

          .preview-box {
            padding: 0.75rem;
            min-height: 45px;
          }

          .controls-grid {
            gap: 0.5rem;
          }

          .control-label {
            font-size: 11px;
          }

          .size-input,
          .font-select {
            padding: 0.5rem;
            font-size: 14px;
          }

          .color-input {
            height: 2.25rem;
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
          .size-input,
          .color-input,
          .font-select,
          .cancel-button,
          .add-button {
            min-height: 44px;
          }
        }
      `}</style>
    </div>
  );
}
