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
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex flex-wrap gap-2">
        {/* Photo/Video Upload */}
        <label className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg cursor-pointer hover:opacity-90 transition-opacity">
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
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition-opacity"
          title="Add decorative frames to photos"
        >
          🖼️ Add Frame
        </button>
        
        {/* Text Button */}
        <button
          onClick={onOpenTextEditor}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          title="Add custom text"
        >
          📝 Add Text
        </button>
        
        {/* Label Button */}
        <button
          onClick={onOpenLabelEditor}
          className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:opacity-90 transition-opacity"
          title="Add decorative labels and tags"
        >
          🏷️ Add Label
        </button>
        
        {/* Stickers Button */}
        <button
          onClick={onOpenStickerPicker}
          className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
          title="Add emoji stickers"
        >
          ✨ Stickers
        </button>
        
        {/* Decorations Button */}
        <button
          onClick={onOpenDecorationPicker}
          className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:opacity-90 transition-opacity"
          title="Add washi tape, clips, and accents"
        >
          🎨 Decorations
        </button>
        
        {/* Background Button */}
        <button
          onClick={onOpenBackgroundPicker}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          title="Change page background color"
        >
          🎨 Background
        </button>

        {/* Template Selector */}
        <select
          value={currentTemplate}
          onChange={(e) => onTemplateChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors ml-auto"
            title="Delete current page"
          >
            🗑️ Delete Page
          </button>
        )}
      </div>

      {/* Helper Text */}
      <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
        <span>💡 Tip:</span>
        <span>Click any element to select it, then drag corners to resize!</span>
      </div>
    </div>
  );
}
