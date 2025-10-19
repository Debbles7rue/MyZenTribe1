// components/album/StickySidebarToolbar.tsx
"use client";

import React, { useState } from 'react';
import { TEMPLATES } from './constants/scrapbookAssets';

type Props = {
  albumId?: string; // ADD THIS LINE
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

export default function StickySidebarToolbar({
  albumId, // ADD THIS LINE
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <>
      {/* DESKTOP SIDEBAR - Hidden on mobile (md:block means show on medium screens and up) */}
      <div className="hidden md:block">
        <div
          className={`fixed top-20 left-4 bg-white rounded-xl shadow-2xl transition-all duration-300 z-40 ${
            isCollapsed ? 'w-14' : 'w-64'
          }`}
          style={{ maxHeight: 'calc(100vh - 6rem)' }}
        >
          {/* Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-4 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center hover:bg-purple-600 transition-colors shadow-lg"
            title={isCollapsed ? 'Expand toolbar' : 'Collapse toolbar'}
          >
            {isCollapsed ? '→' : '←'}
          </button>

          {/* Collapsed View */}
          {isCollapsed ? (
            <div className="p-3 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 7rem)' }}>
              <button
                onClick={() => setIsCollapsed(false)}
                className="w-full aspect-square bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity text-2xl"
                title="Expand to see all tools"
              >
                🎨
              </button>
            </div>
          ) : (
            /* Expanded View */
            <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 7rem)' }}>
              <h3 className="text-lg font-bold mb-3 text-purple-600">🎨 Scrapbook Tools</h3>

              <div className="space-y-2">
                {/* Photo/Video Upload */}
                <label className="block w-full px-3 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg cursor-pointer hover:opacity-90 transition-opacity text-sm font-medium text-center">
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
                  className="w-full px-3 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                >
                  🖼️ Add Frame
                </button>

                {/* Text Button */}
                <button
                  onClick={onOpenTextEditor}
                  className="w-full px-3 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  📝 Add Text
                </button>

                {/* Label Button */}
                <button
                  onClick={onOpenLabelEditor}
                  className="w-full px-3 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                >
                  🏷️ Add Label
                </button>

                {/* Stickers Button */}
                <button
                  onClick={onOpenStickerPicker}
                  className="w-full px-3 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium"
                >
                  ✨ Stickers
                </button>

                {/* Decorations Button */}
                <button
                  onClick={onOpenDecorationPicker}
                  className="w-full px-3 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                >
                  🎨 Decorations
                </button>

                {/* Background Button */}
                <button
                  onClick={onOpenBackgroundPicker}
                  className="w-full px-3 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                >
                  🎨 Background
                </button>

                {/* ADD THE ORGANIZE PHOTOS BUTTON HERE */}
{albumId && (
  <button
    onClick={() => window.location.href = `/albums/${albumId}/organize`}
    className="w-full px-3 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
  >
    📦 Organize Photos
  </button>
)}

                {/* Divider */}
                <div className="border-t border-gray-200 my-3"></div>

                {/* Template Selector */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Layout Template</label>
                  <select
                    value={currentTemplate}
                    onChange={(e) => onTemplateChange(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {Object.entries(TEMPLATES).map(([key, template]) => (
                      <option key={key} value={key}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Delete Page Button */}
                {showDeletePage && canDeletePage && onDeletePage && (
                  <>
                    <div className="border-t border-gray-200 my-3"></div>
                    <button
                      onClick={onDeletePage}
                      className="w-full px-3 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                    >
                      🗑️ Delete Page
                    </button>
                  </>
                )}
              </div>

              {/* Helper Text */}
              <div className="mt-4 p-2 bg-purple-50 rounded-lg">
                <p className="text-xs text-purple-600">
                  💡 <strong>Tip:</strong> Click any element, then drag corners to resize!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Spacer to prevent content from being hidden behind sidebar (only when expanded) */}
        {!isCollapsed && <div className="w-64 flex-shrink-0"></div>}
      </div>

      {/* MOBILE FLOATING BUTTON - Only visible on mobile (md:hidden means hide on medium screens and up) */}
      <div className="md:hidden">
        {/* Floating Action Button */}
        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-50 text-2xl"
          aria-label="Open tools menu"
        >
          🎨
        </button>

        {/* Mobile Bottom Drawer */}
        {isMobileDrawerOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
              onClick={() => setIsMobileDrawerOpen(false)}
            ></div>

            {/* Drawer */}
            <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[85vh] flex flex-col animate-slide-up">
              {/* Drawer Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
              </div>

              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
                <h3 className="text-lg font-bold text-purple-600">🎨 Scrapbook Tools</h3>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500"
                  aria-label="Close menu"
                >
                  ✕
                </button>
              </div>

              {/* Drawer Content - Scrollable */}
              <div className="overflow-y-auto flex-1 px-6 py-4">
                <div className="space-y-3 pb-6">
                  {/* Photo/Video Upload */}
                  <label className="block w-full px-4 py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl cursor-pointer active:opacity-80 transition-opacity text-base font-medium text-center shadow-md">
                    {uploading ? '⏳ Uploading...' : '📷 Add Photos/Videos'}
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={(e) => {
                        if (e.target.files) {
                          onPhotoUpload(e.target.files);
                          setIsMobileDrawerOpen(false);
                        }
                      }}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>

                  {/* Frame Button */}
                  <button
                    onClick={() => {
                      onOpenFramePicker();
                      setIsMobileDrawerOpen(false);
                    }}
                    className="w-full px-4 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl active:opacity-80 transition-opacity text-base font-medium shadow-md"
                  >
                    🖼️ Add Frame
                  </button>

                  {/* Text Button */}
                  <button
                    onClick={() => {
                      onOpenTextEditor();
                      setIsMobileDrawerOpen(false);
                    }}
                    className="w-full px-4 py-3.5 bg-blue-500 text-white rounded-xl active:opacity-80 transition-opacity text-base font-medium shadow-md"
                  >
                    📝 Add Text
                  </button>

                  {/* Label Button */}
                  <button
                    onClick={() => {
                      onOpenLabelEditor();
                      setIsMobileDrawerOpen(false);
                    }}
                    className="w-full px-4 py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl active:opacity-80 transition-opacity text-base font-medium shadow-md"
                  >
                    🏷️ Add Label
                  </button>

                  {/* Stickers Button */}
                  <button
                    onClick={() => {
                      onOpenStickerPicker();
                      setIsMobileDrawerOpen(false);
                    }}
                    className="w-full px-4 py-3.5 bg-yellow-500 text-white rounded-xl active:opacity-80 transition-opacity text-base font-medium shadow-md"
                  >
                    ✨ Stickers
                  </button>

                  {/* Decorations Button */}
                  <button
                    onClick={() => {
                      onOpenDecorationPicker();
                      setIsMobileDrawerOpen(false);
                    }}
                    className="w-full px-4 py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl active:opacity-80 transition-opacity text-base font-medium shadow-md"
                  >
                    🎨 Decorations
                  </button>

                  {/* Background Button */}
                  <button
                    onClick={() => {
                      onOpenBackgroundPicker();
                      setIsMobileDrawerOpen(false);
                    }}
                    className="w-full px-4 py-3.5 bg-green-500 text-white rounded-xl active:opacity-80 transition-opacity text-base font-medium shadow-md"
                  >
                    🎨 Background
                  </button>
                  {/* ADD THE ORGANIZE PHOTOS BUTTON HERE */}
{albumId && (
  <button
    onClick={() => {
      window.location.href = `/albums/${albumId}/organize`;
      setIsMobileDrawerOpen(false);
    }}
    className="w-full px-4 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl active:opacity-80 transition-opacity text-base font-medium shadow-md"
  >
    📦 Organize Photos
  </button>
)}

                  {/* Divider */}
                  <div className="border-t border-gray-200 my-4"></div>

                  {/* Template Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Layout Template</label>
                    <select
                      value={currentTemplate}
                      onChange={(e) => {
                        onTemplateChange(e.target.value);
                        setIsMobileDrawerOpen(false);
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {Object.entries(TEMPLATES).map(([key, template]) => (
                        <option key={key} value={key}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Delete Page Button */}
                  {showDeletePage && canDeletePage && onDeletePage && (
                    <>
                      <div className="border-t border-gray-200 my-4"></div>
                      <button
                        onClick={() => {
                          onDeletePage();
                          setIsMobileDrawerOpen(false);
                        }}
                        className="w-full px-4 py-3.5 bg-red-500 text-white rounded-xl active:opacity-80 transition-opacity text-base font-medium shadow-md"
                      >
                        🗑️ Delete Page
                      </button>
                    </>
                  )}

                  {/* Helper Text */}
                  <div className="mt-4 p-3 bg-purple-50 rounded-xl">
                    <p className="text-sm text-purple-600">
                      💡 <strong>Tip:</strong> Tap any element, then drag corners to resize!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
