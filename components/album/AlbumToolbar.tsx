// components/album/AlbumToolbar.tsx
"use client";

import React from 'react';
import { TEMPLATES } from './constants/scrapbookAssets';

type Props = {
  currentTemplate: string;
  uploading: boolean;
  canDeletePage: boolean;
  onPhotoUpload: (files: FileList) => void;
  onOpenFramePicker: () => void;
  onOpenTextEditor: () => void;
  onOpenLabelEditor: () => void;
  onOpenStickerPicker: () => void;
  onOpenDecorationPicker: () => void;
  onOpenBackgroundPicker: () => void;
  onTemplateChange: (template: string) => void;
  onDeletePage?: () => void;
  showDeletePage?: boolean;
};

export default function AlbumToolbar({
  currentTemplate,
  uploading,
  canDeletePage,
  onPhotoUpload,
  onOpenFramePicker,
  onOpenTextEditor,
  onOpenLabelEditor,
  onOpenStickerPicker,
  onOpenDecorationPicker,
  onOpenBackgroundPicker,
  onTemplateChange,
  onDeletePage,
  showDeletePage = false
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 album-toolbar">
      <div className="flex flex-wrap gap-2 toolbar-buttons">
        {/* Photo/Video Upload */}
        <label className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg cursor-pointer hover:opacity-90 transition-opacity toolbar-button upload-button">
          {uploading ? '⏳ Uploading...' : '📷 Add Photos/Videos'}
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) => e.target.files && onPhotoUpload(e.target.files)}
            className="hidden"
            disabled={uploading}
          />
        </label>
        
        {/* Frame Button */}
        <button
          onClick={onOpenFramePicker}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition-opacity toolbar-button"
          title="Add decorative frames to photos"
        >
          🖼️ Add Frame
        </button>
        
        {/* Text Button */}
        <button
          onClick={onOpenTextEditor}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors toolbar-button"
          title="Add custom text"
        >
          📝 Add Text
        </button>
        
        {/* Label Button */}
        <button
          onClick={onOpenLabelEditor}
          className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:opacity-90 transition-opacity toolbar-button"
          title="Add decorative labels and tags"
        >
          🏷️ Add Label
        </button>
        
        {/* Stickers Button */}
        <button
          onClick={onOpenStickerPicker}
          className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors toolbar-button"
          title="Add emoji stickers"
        >
          ✨ Stickers
        </button>
        
        {/* Decorations Button */}
        <button
          onClick={onOpenDecorationPicker}
          className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:opacity-90 transition-opacity toolbar-button"
          title="Add washi tape, clips, and accents"
        >
          🎨 Decorations
        </button>
        
        {/* Background Button */}
        <button
          onClick={onOpenBackgroundPicker}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors toolbar-button"
          title="Change page background color"
        >
          🎨 Background
        </button>

        {/* Template Selector */}
        <select
          value={currentTemplate}
          onChange={(e) => onTemplateChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent template-select"
          title="Apply layout template"
        >
          {Object.entries(TEMPLATES).map(([key, template]) => (
            <option key={key} value={key}>
              {template.name}
            </option>
          ))}
        </select>

        {/* Delete Page Button */}
        {showDeletePage && canDeletePage && onDeletePage && (
          <button
            onClick={onDeletePage}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors ml-auto delete-page-button"
            title="Delete current page"
          >
            🗑️ Delete Page
          </button>
        )}
      </div>

      {/* Helper Text */}
      <div className="mt-3 text-xs text-gray-500 flex items-center gap-2 helper-text">
        <span>💡 Tip:</span>
        <span>Click any element to select it, then drag corners to resize!</span>
      </div>

      <style jsx>{`
        /* Mobile Optimizations */
        @media (max-width: 768px) {
          .album-toolbar {
            padding: 0.75rem;
          }

          .toolbar-buttons {
            gap: 0.5rem;
          }

          .toolbar-button,
          .upload-button {
            flex: 1;
            min-width: calc(50% - 0.25rem);
            padding: 0.875rem 0.5rem;
            font-size: 13px;
            text-align: center;
            white-space: nowrap;
            touch-action: manipulation;
          }

          .template-select {
            width: 100%;
            padding: 0.875rem;
            font-size: 16px; /* Prevents iOS zoom */
            touch-action: manipulation;
          }

          .delete-page-button {
            width: 100%;
            margin-left: 0;
            margin-top: 0.5rem;
            padding: 0.875rem;
            font-size: 14px;
            touch-action: manipulation;
          }

          .helper-text {
            font-size: 11px;
            flex-wrap: wrap;
            gap: 0.25rem;
          }

          .helper-text span {
            line-height: 1.4;
          }
        }

        /* Small mobile screens */
        @media (max-width: 480px) {
          .album-toolbar {
            padding: 0.625rem;
          }

          .toolbar-button,
          .upload-button {
            font-size: 12px;
            padding: 0.75rem 0.375rem;
          }

          .template-select {
            padding: 0.75rem;
            font-size: 16px;
          }

          .delete-page-button {
            padding: 0.75rem;
            font-size: 13px;
          }

          .helper-text {
            font-size: 10px;
          }
        }

        /* Better touch support */
        @media (hover: none) and (pointer: coarse) {
          .toolbar-button,
          .upload-button,
          .template-select,
          .delete-page-button {
            min-height: 44px;
          }
        }

        /* Landscape mobile orientation */
        @media (max-width: 768px) and (orientation: landscape) {
          .toolbar-buttons {
            max-height: 30vh;
            overflow-y: auto;
          }
        }
      `}</style>
    </div>
  );
}
