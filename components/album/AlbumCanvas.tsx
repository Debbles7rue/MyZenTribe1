// components/album/AlbumCanvas.tsx
"use client";

import React, { useRef, useEffect } from 'react';
import { AlbumPage } from './constants/scrapbookAssets';
import AlbumElement from './AlbumElement';

type Props = {
  pages: AlbumPage[];
  currentPageIndex: number;
  selectedElement: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (pageIndex: number, elementId: string, updates: any) => void;
  onSetCurrentPage: (index: number) => void;
  isEditMode?: boolean;
  showAllPages?: boolean; // For vertical layout in edit mode
};

export default function AlbumCanvas({
  pages,
  currentPageIndex,
  selectedElement,
  onSelectElement,
  onUpdateElement,
  onSetCurrentPage,
  isEditMode = true,
  showAllPages = true
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    isDragging: boolean;
    isResizing: boolean;
    elementId: string | null;
    resizeCorner: string | null;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
    pageIndex: number;
    element: any | null;
  }>({
    isDragging: false,
    isResizing: false,
    elementId: null,
    resizeCorner: null,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    initialWidth: 0,
    initialHeight: 0,
    pageIndex: 0,
    element: null
  });

  // Handle element drag start
  function handleElementMouseDown(pageIndex: number, elementId: string, e: React.MouseEvent) {
    if (!isEditMode || dragStateRef.current.isResizing) return;
    
    e.preventDefault();
    onSelectElement(elementId);
    onSetCurrentPage(pageIndex);

    const element = pages[pageIndex].elements.find(el => el.id === elementId);
    if (!element || !canvasRef.current) return;

    dragStateRef.current = {
      isDragging: true,
      isResizing: false,
      elementId,
      resizeCorner: null,
      startX: e.clientX,
      startY: e.clientY,
      initialX: element.x,
      initialY: element.y,
      initialWidth: element.width,
      initialHeight: element.height,
      pageIndex
    };
  }

  // Handle element resize start
  function handleResizeStart(pageIndex: number, elementId: string, corner: string, e: React.MouseEvent) {
    if (!isEditMode) return;
    
    e.preventDefault();
    e.stopPropagation();

    const element = pages[pageIndex].elements.find(el => el.id === elementId);
    if (!element) return;

    dragStateRef.current = {
      isDragging: false,
      isResizing: true,
      elementId,
      resizeCorner: corner,
      startX: e.clientX,
      startY: e.clientY,
      initialX: element.x,
      initialY: element.y,
      initialWidth: element.width,
      initialHeight: element.height,
      pageIndex
    };
  }

  // Handle mouse move
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const state = dragStateRef.current;
      if (!state.elementId || !canvasRef.current) return;

      const canvas = canvasRef.current.getBoundingClientRect();
      const deltaX = ((e.clientX - state.startX) / canvas.width) * 100;
      const deltaY = ((e.clientY - state.startY) / canvas.height) * 100;

      if (state.isDragging) {
        // Dragging element
        onUpdateElement(state.pageIndex, state.elementId, {
          x: Math.max(0, Math.min(90, state.initialX + deltaX)),
          y: Math.max(0, Math.min(90, state.initialY + deltaY))
        });
      } else if (state.isResizing && state.resizeCorner) {
        // Resizing element
        const updates: any = {};
        
        if (state.resizeCorner === 'se') {
          updates.width = Math.max(5, state.initialWidth + deltaX);
          updates.height = Math.max(5, state.initialHeight + deltaY);
        } else if (state.resizeCorner === 'sw') {
          updates.width = Math.max(5, state.initialWidth - deltaX);
          updates.height = Math.max(5, state.initialHeight + deltaY);
          updates.x = state.initialX + deltaX;
        } else if (state.resizeCorner === 'ne') {
          updates.width = Math.max(5, state.initialWidth + deltaX);
          updates.height = Math.max(5, state.initialHeight - deltaY);
          updates.y = state.initialY + deltaY;
        } else if (state.resizeCorner === 'nw') {
          updates.width = Math.max(5, state.initialWidth - deltaX);
          updates.height = Math.max(5, state.initialHeight - deltaY);
          updates.x = state.initialX + deltaX;
          updates.y = state.initialY + deltaY;
        }

        onUpdateElement(state.pageIndex, state.elementId, updates);
      }
    }

    function handleMouseUp() {
      dragStateRef.current = {
        isDragging: false,
        isResizing: false,
        elementId: null,
        resizeCorner: null,
        startX: 0,
        startY: 0,
        initialX: 0,
        initialY: 0,
        initialWidth: 0,
        initialHeight: 0,
        pageIndex: 0
      };
    }

    if (dragStateRef.current.isDragging || dragStateRef.current.isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [pages, onUpdateElement]);

  // Single Page View
  if (!showAllPages) {
    const currentPage = pages[currentPageIndex];
    if (!currentPage) return null;

    return (
      <div
        ref={canvasRef}
        className="relative border-2 border-gray-300 rounded-lg"
        style={{
          minHeight: '500px',
          backgroundColor: currentPage.backgroundColor,
          cursor: dragStateRef.current.isDragging ? 'grabbing' : 'default'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onSelectElement(null);
          }
        }}
      >
        {currentPage.elements.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-3xl mb-2">📸</p>
              <p className="text-lg">Add content to this page</p>
            </div>
          </div>
        ) : (
          currentPage.elements.map((element) => (
            <AlbumElement
              key={element.id}
              element={element}
              isSelected={selectedElement === element.id}
              isEditable={isEditMode}
              onMouseDown={(e) => handleElementMouseDown(currentPageIndex, element.id, e)}
              onClick={(e) => {
                e.stopPropagation();
                onSelectElement(element.id);
              }}
              onResizeStart={(corner, e) => handleResizeStart(currentPageIndex, element.id, corner, e)}
            />
          ))
        )}
      </div>
    );
  }

  // Vertical Multi-Page View (for editing)
  return (
    <div ref={canvasRef} className="space-y-8">
      {pages.map((page, pageIndex) => (
        <div 
          key={page.id} 
          className={`border-4 rounded-lg p-4 transition-all ${
            pageIndex === currentPageIndex 
              ? 'border-purple-500 shadow-xl' 
              : 'border-dashed border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">📄 Page {pageIndex + 1}</h3>
            <button
              onClick={() => onSetCurrentPage(pageIndex)}
              className={`px-3 py-1 rounded transition-all ${
                pageIndex === currentPageIndex 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {pageIndex === currentPageIndex ? '✓ Editing' : 'Edit This Page'}
            </button>
          </div>

          <div
            className="relative border-2 border-gray-300 rounded-lg"
            style={{
              minHeight: '500px',
              backgroundColor: page.backgroundColor,
              cursor: dragStateRef.current.isDragging && dragStateRef.current.pageIndex === pageIndex ? 'grabbing' : 'default'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                onSelectElement(null);
              }
            }}
          >
            {page.elements.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <p className="text-3xl mb-2">📸</p>
                  <p className="text-lg">Add content to this page</p>
                  <p className="text-sm mt-2">
                    {pageIndex === currentPageIndex 
                      ? 'Click the buttons above to add photos, frames, and decorations' 
                      : 'Click "Edit This Page" to add content'}
                  </p>
                </div>
              </div>
            ) : (
              page.elements.map((element) => (
                <AlbumElement
                  key={element.id}
                  element={element}
                  isSelected={selectedElement === element.id && currentPageIndex === pageIndex}
                  isEditable={isEditMode && currentPageIndex === pageIndex}
                  onMouseDown={(e) => handleElementMouseDown(pageIndex, element.id, e)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectElement(element.id);
                    onSetCurrentPage(pageIndex);
                  }}
                  onResizeStart={(corner, e) => handleResizeStart(pageIndex, element.id, corner, e)}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
