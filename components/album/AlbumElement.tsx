// components/album/AlbumElement.tsx
"use client";

import React from 'react';
import { AlbumElement as ElementType, FRAME_STYLES, LABEL_STYLES, getWashiTapeStyle } from './constants/scrapbookAssets';

type Props = {
  element: ElementType;
  isSelected: boolean;
  isEditable: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onResizeStart: (corner: string, e: React.MouseEvent) => void;
};

export default function AlbumElement({ 
  element, 
  isSelected, 
  isEditable,
  onMouseDown, 
  onClick,
  onResizeStart 
}: Props) {
  
  return (
    <div
      className={`absolute transition-all album-element ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      }`}
      style={{
        left: `${element.x}%`,
        top: `${element.y}%`,
        width: `${element.width}%`,
        height: `${element.height}%`,
        transform: `rotate(${element.rotation}deg)`,
        zIndex: element.zIndex,
        cursor: isEditable ? 'move' : 'default',
        pointerEvents: isEditable ? 'auto' : 'none'
      }}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      {/* Photo */}
      {element.type === 'photo' && (
        <img 
          src={element.content} 
          alt="" 
          className="w-full h-full object-cover rounded-lg shadow-lg element-photo"
          draggable={false}
        />
      )}

      {/* Frame with Photo */}
      {element.type === 'frame' && element.frameStyle && (
        <>
          {FRAME_STYLES[element.frameStyle as keyof typeof FRAME_STYLES].isPureShape ? (
            // Pure shape crop - no container, just clipped image
            <div className="w-full h-full element-frame-shape">
              <img 
                src={element.content} 
                alt="" 
                className="w-full h-full object-cover"
                draggable={false}
                style={{
                  clipPath: FRAME_STYLES[element.frameStyle as keyof typeof FRAME_STYLES].clipPath,
                  boxShadow: FRAME_STYLES[element.frameStyle as keyof typeof FRAME_STYLES].shadow
                }}
              />
            </div>
          ) : (
            // Decorative frame with border/background
            <div 
              className="w-full h-full flex items-center justify-center overflow-hidden element-frame-decorative"
              style={{
                padding: FRAME_STYLES[element.frameStyle as keyof typeof FRAME_STYLES].padding,
                background: FRAME_STYLES[element.frameStyle as keyof typeof FRAME_STYLES].background,
                border: FRAME_STYLES[element.frameStyle as keyof typeof FRAME_STYLES].border,
                borderRadius: FRAME_STYLES[element.frameStyle as keyof typeof FRAME_STYLES].borderRadius,
                boxShadow: FRAME_STYLES[element.frameStyle as keyof typeof FRAME_STYLES].shadow
              }}
            >
              <div 
                className="w-full h-full overflow-hidden" 
                style={{
                  borderRadius: FRAME_STYLES[element.frameStyle as keyof typeof FRAME_STYLES].borderRadius,
                  clipPath: FRAME_STYLES[element.frameStyle as keyof typeof FRAME_STYLES].clipPath
                }}
              >
                <img 
                  src={element.content} 
                  alt="" 
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Video */}
      {element.type === 'video' && (
        <video 
          src={element.content}
          controls
          className="w-full h-full object-cover rounded-lg shadow-lg element-video"
        />
      )}

      {/* Text */}
      {element.type === 'text' && (
        <div 
          className="p-2 flex items-center justify-center h-full element-text"
          style={{
            fontSize: `${element.fontSize}px`,
            color: element.fontColor,
            fontFamily: element.fontFamily,
            textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
            wordBreak: 'break-word',
            textAlign: 'center'
          }}
        >
          {element.content}
        </div>
      )}

      {/* Label */}
      {element.type === 'label' && element.labelStyle && (
        <div 
          className="w-full h-full flex items-center justify-center p-2 rounded-lg shadow-md element-label"
          style={{
            backgroundColor: LABEL_STYLES[element.labelStyle as keyof typeof LABEL_STYLES].bg,
            border: LABEL_STYLES[element.labelStyle as keyof typeof LABEL_STYLES].border,
            fontSize: `${element.fontSize}px`,
            color: element.fontColor,
            fontFamily: element.fontFamily,
            fontWeight: 'bold'
          }}
        >
          {element.content}
        </div>
      )}

      {/* Sticker */}
      {element.type === 'sticker' && (
        <div 
          className="flex items-center justify-center w-full h-full element-sticker"
          style={{ 
            fontSize: `${Math.min(element.width, element.height) * 0.8}px`,
            lineHeight: 1
          }}
        >
          {element.content}
        </div>
      )}

      {/* Decoration */}
      {element.type === 'decoration' && (
        <div 
          className="flex items-center justify-center w-full h-full element-decoration"
          style={{ fontSize: `${element.fontSize}px` }}
        >
          {element.content.includes('Washi Tape') ? (
            <div 
              className="w-full h-full"
              style={{
                background: getWashiTapeStyle(element.content),
                borderRadius: '4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            />
          ) : (
            <span style={{ fontSize: `${Math.min(element.width, element.height) * 0.8}px` }}>
              {element.content.split(' - ')[0]}
            </span>
          )}
        </div>
      )}

      {/* Resize Handles - Only show when selected and editable */}
      {isSelected && isEditable && (
        <>
          <div
            className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize z-10 resize-handle resize-nw"
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart('nw', e);
            }}
          />
          <div
            className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize z-10 resize-handle resize-ne"
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart('ne', e);
            }}
          />
          <div
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize z-10 resize-handle resize-sw"
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart('sw', e);
            }}
          />
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize z-10 resize-handle resize-se"
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart('se', e);
            }}
          />
        </>
      )}

      <style jsx>{`
        /* Mobile Optimizations */
        @media (max-width: 768px) {
          .album-element {
            touch-action: none;
          }

          /* Make resize handles larger for touch */
          .resize-handle {
            width: 1rem !important;
            height: 1rem !important;
          }

          .resize-nw {
            top: -0.5rem !important;
            left: -0.5rem !important;
          }

          .resize-ne {
            top: -0.5rem !important;
            right: -0.5rem !important;
          }

          .resize-sw {
            bottom: -0.5rem !important;
            left: -0.5rem !important;
          }

          .resize-se {
            bottom: -0.5rem !important;
            right: -0.5rem !important;
          }

          /* Ensure images and videos are touch-friendly */
          .element-photo,
          .element-video {
            -webkit-user-select: none;
            -moz-user-select: none;
            user-select: none;
          }

          /* Text should scale better on mobile */
          .element-text {
            padding: 0.5rem;
          }

          /* Labels should be readable on mobile */
          .element-label {
            padding: 0.375rem;
          }

          /* Stickers and decorations should be touch-friendly */
          .element-sticker,
          .element-decoration {
            -webkit-user-select: none;
            -moz-user-select: none;
            user-select: none;
          }
        }

        /* Small mobile screens */
        @media (max-width: 480px) {
          .resize-handle {
            width: 1.25rem !important;
            height: 1.25rem !important;
          }

          .resize-nw {
            top: -0.625rem !important;
            left: -0.625rem !important;
          }

          .resize-ne {
            top: -0.625rem !important;
            right: -0.625rem !important;
          }

          .resize-sw {
            bottom: -0.625rem !important;
            left: -0.625rem !important;
          }

          .resize-se {
            bottom: -0.625rem !important;
            right: -0.625rem !important;
          }

          .element-text {
            padding: 0.375rem;
          }

          .element-label {
            padding: 0.25rem;
          }
        }

        /* Better touch support for all devices */
        @media (hover: none) and (pointer: coarse) {
          .album-element {
            cursor: grab !important;
          }

          .album-element:active {
            cursor: grabbing !important;
          }

          .resize-handle {
            width: 1.25rem !important;
            height: 1.25rem !important;
            touch-action: none;
          }
        }
      `}</style>
    </div>
  );
}
